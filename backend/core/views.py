import json
import secrets
import uuid
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.contrib.auth import authenticate
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .expense_utils import shares_from_line_items
from .jwt_auth import create_token, user_from_request
from .models import AdhocCalculation, Expense, Room, TextResource, User
from .settlement import simplify_debts


def _body(request) -> dict:
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


def _require_auth(request):
    user = user_from_request(request)
    if not user:
        return None, JsonResponse({"error": "Требуется авторизация"}, status=401)
    return user, None


def _user_public_json(request, user: User) -> dict:
    avatar_url = None
    if user.avatar:
        avatar_url = request.build_absolute_uri(user.avatar.url)
    parts = [user.first_name or "", user.last_name or ""]
    full_name = " ".join(p for p in parts if p).strip() or user.username
    return {
        "id": str(user.id),
        "displayName": user.first_name or "",
        "lastName": user.last_name or "",
        "fullName": full_name,
        "login": user.username,
        "email": user.email or "",
        "phone": user.phone or "",
        "inviteCode": user.invite_code,
        "avatarUrl": avatar_url,
        "preferredLanguage": user.preferred_language or "ru",
        "theme": user.theme or "light",
        "accent": user.accent or "mint",
    }


@require_GET
def health(_request):
    return JsonResponse({"ok": True, "service": "copay-api"})


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    data = _body(request)
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    display_name = (data.get("displayName") or "").strip()
    login = (email or phone).lower()
    if not login or not password or not display_name:
        return JsonResponse(
            {"error": "Укажите email или телефон, пароль и имя"}, status=400
        )
    if len(password) < 6:
        return JsonResponse({"error": "Пароль не короче 6 символов"}, status=400)
    if User.objects.filter(username__iexact=login).exists():
        return JsonResponse({"error": "Пользователь уже существует"}, status=409)
    user = User.objects.create_user(
        username=login,
        password=password,
        first_name=display_name,
        last_name=(data.get("lastName") or "").strip()[:150],
        email=email or "",
    )
    user.phone = phone or ""
    user.save(update_fields=["phone"])
    token = create_token(user)
    return JsonResponse(
        {
            "token": token,
            "user": _user_public_json(request, user),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    data = _body(request)
    login = (data.get("email") or data.get("phone") or "").strip().lower()
    password = data.get("password") or ""
    if not login or not password:
        return JsonResponse({"error": "Укажите логин и пароль"}, status=400)
    user = authenticate(request, username=login, password=password)
    if not user:
        return JsonResponse({"error": "Неверные учётные данные"}, status=401)
    token = create_token(user)
    return JsonResponse(
        {
            "token": token,
            "user": _user_public_json(request, user),
        }
    )


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
def me(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "GET":
        return JsonResponse(_user_public_json(request, user))
    data = _body(request)
    if "displayName" in data:
        user.first_name = str(data.get("displayName") or "").strip()[:150]
    if "lastName" in data:
        user.last_name = str(data.get("lastName") or "").strip()[:150]
    if "email" in data:
        new_email = str(data.get("email") or "").strip()[:254]
        if new_email and User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
            return JsonResponse({"error": "Такой email уже занят"}, status=409)
        user.email = new_email
        if new_email:
            login_candidate = new_email.lower()
            if User.objects.filter(username__iexact=login_candidate).exclude(pk=user.pk).exists():
                return JsonResponse(
                    {"error": "Этот email уже используется как логин"}, status=409
                )
            user.username = login_candidate
    if "phone" in data:
        user.phone = str(data.get("phone") or "").strip()[:32]
    if "login" in data:
        new_login = str(data.get("login") or "").strip().lower()
        if new_login and new_login != user.username:
            if User.objects.filter(username__iexact=new_login).exclude(pk=user.pk).exists():
                return JsonResponse({"error": "Такой логин уже занят"}, status=409)
            user.username = new_login
    if "preferredLanguage" in data:
        lang = str(data.get("preferredLanguage") or "ru").lower()[:8]
        user.preferred_language = "en" if lang.startswith("en") else "ru"
    if "theme" in data:
        th = str(data.get("theme") or "light").lower()[:16]
        user.theme = th if th in ("light", "dark") else "light"
    if "accent" in data:
        user.accent = str(data.get("accent") or "mint").lower()[:24]
    user.save()
    return JsonResponse(_user_public_json(request, user))


@require_GET
def i18n_strings(request):
    lang = (request.GET.get("lang") or "ru").lower()[:8]
    field = "en" if lang.startswith("en") else "ru"
    rows = TextResource.objects.all().values("key", "ru", "en")
    return JsonResponse({r["key"]: r[field] for r in rows})


@csrf_exempt
@require_http_methods(["POST"])
def me_avatar(request):
    user, err = _require_auth(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("avatar")
    if not f:
        return JsonResponse({"error": "Прикрепите файл изображения"}, status=400)
    if f.size > 5 * 1024 * 1024:
        return JsonResponse({"error": "Файл больше 5 МБ"}, status=400)
    ct = (f.content_type or "").lower()
    if not ct.startswith("image/"):
        return JsonResponse({"error": "Нужен файл изображения"}, status=400)
    ext = Path(f.name or "").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    safe_name = f"avatars/u{user.pk}_{uuid.uuid4().hex}{ext}"
    user.avatar.save(safe_name, f, save=True)
    return JsonResponse({"avatarUrl": _user_public_json(request, user)["avatarUrl"]})


@require_GET
def user_search(request):
    user, err = _require_auth(request)
    if err:
        return err
    q = (request.GET.get("q") or "").strip()
    if len(q) < 2:
        return JsonResponse([], safe=False)
    tokens = q.split()
    qs = User.objects.exclude(pk=user.pk)
    name_q = Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(username__icontains=q)
    for t in tokens:
        if len(t) >= 2:
            name_q |= Q(first_name__icontains=t) | Q(last_name__icontains=t)
    qs = qs.filter(name_q).distinct()[:30]
    out = [
        {
            "id": str(u.id),
            "displayName": u.first_name or "",
            "lastName": u.last_name or "",
            "fullName": " ".join(
                p for p in [u.first_name or "", u.last_name or ""] if p
            ).strip()
            or u.username,
        }
        for u in qs
    ]
    return JsonResponse(out, safe=False)


@require_GET
def room_detail(request, room_id):
    user, err = _require_auth(request)
    if err:
        return err
    room, e = _room_for_user(user, room_id)
    if e:
        return e
    members = []
    for m in room.members.all():
        members.append(
            {
                "id": str(m.id),
                "displayName": m.first_name or "",
                "lastName": m.last_name or "",
                "fullName": " ".join(
                    p for p in [m.first_name or "", m.last_name or ""] if p
                ).strip()
                or m.username,
            }
        )
    return JsonResponse(
        {
            "id": str(room.id),
            "name": room.name,
            "currency": room.currency,
            "createdBy": str(room.created_by_id),
            "memberIds": [str(m.id) for m in room.members.all()],
            "members": members,
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def rooms(request):
    if request.method == "GET":
        return _rooms_list(request)
    return _rooms_create(request)


def _rooms_list(request):
    user, err = _require_auth(request)
    if err:
        return err
    qs = Room.objects.filter(members=user).distinct()
    out = []
    for r in qs:
        out.append(
            {
                "id": str(r.id),
                "name": r.name,
                "currency": r.currency,
                "memberIds": [str(m.id) for m in r.members.all()],
                "createdBy": str(r.created_by_id),
            }
        )
    return JsonResponse(out, safe=False)


def _rooms_create(request):
    user, err = _require_auth(request)
    if err:
        return err
    data = _body(request)
    name = (data.get("name") or "").strip()
    if len(name) < 2:
        return JsonResponse({"error": "Название комнаты от 2 символов"}, status=400)
    cur = str(data.get("currency") or "RUB").upper()[:8]
    if cur not in ("RUB", "USD", "EUR"):
        cur = "RUB"
    room = Room.objects.create(name=name, created_by=user, currency=cur)
    room.members.add(user)
    return JsonResponse(
        {
            "id": str(room.id),
            "name": room.name,
            "currency": room.currency,
            "memberIds": [str(user.id)],
            "createdBy": str(user.id),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["POST"])
def room_add_member(request, room_id):
    user, err = _require_auth(request)
    if err:
        return err
    data = _body(request)
    other_id = data.get("userId")
    invite_code = (data.get("inviteCode") or "").strip().upper()
    try:
        room = Room.objects.get(pk=room_id)
    except Room.DoesNotExist:
        return JsonResponse({"error": "Комната не найдена"}, status=404)
    if room.created_by_id != user.id:
        return JsonResponse(
            {"error": "Только создатель управляет составом"}, status=403
        )
    other = None
    if other_id:
        try:
            other = User.objects.get(pk=other_id)
        except (User.DoesNotExist, ValueError, TypeError):
            other = None
    elif invite_code:
        other = User.objects.filter(invite_code__iexact=invite_code).first()
    if not other:
        return JsonResponse({"error": "Пользователь не найден"}, status=404)
    room.members.add(other)
    return JsonResponse({"ok": True})


def _room_for_user(user, room_id):
    try:
        room = Room.objects.get(pk=room_id)
    except (Room.DoesNotExist, ValueError):
        return None, JsonResponse({"error": "Комната не найдена"}, status=404)
    if not room.members.filter(pk=user.id).exists():
        return None, JsonResponse({"error": "Нет доступа к комнате"}, status=403)
    return room, None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def room_expenses(request, room_id):
    if request.method == "GET":
        return _expenses_list(request, room_id)
    return _expenses_create(request, room_id)


def _expenses_list(request, room_id):
    user, err = _require_auth(request)
    if err:
        return err
    room, e = _room_for_user(user, room_id)
    if e:
        return e
    items = []
    for ex in room.expenses.all():
        items.append(_expense_json(ex))
    return JsonResponse(items, safe=False)


def _expense_json(ex: Expense):
    return {
        "id": str(ex.id),
        "roomId": str(ex.room_id),
        "title": ex.title,
        "amount": float(ex.amount),
        "payerId": str(ex.payer_id),
        "shares": {str(k): float(v) for k, v in ex.shares.items()},
        "lineItems": ex.line_items or [],
        "createdAt": ex.created_at.isoformat(),
    }


def _build_expense_from_body(room, data, user):
    title = (data.get("title") or "").strip() or "Расход"
    payer_id = data.get("payerId") or str(user.id)
    member_ids = {str(m.id) for m in room.members.all()}
    if payer_id not in member_ids:
        return None, JsonResponse(
            {"error": "Плательщик должен быть участником комнаты"}, status=400
        )
    line_items = data.get("lineItems")
    if isinstance(line_items, list) and len(line_items) > 0:
        total, owed, stored = shares_from_line_items(member_ids, line_items)
        if total <= 0:
            return None, JsonResponse({"error": "Добавьте позиции с суммой"}, status=400)
        amount = total.quantize(Decimal("0.01"))
        normalized = {k: float(v) for k, v in owed.items()}
    else:
        try:
            amount = Decimal(str(data.get("amount")))
        except (InvalidOperation, TypeError, ValueError):
            amount = None
        if amount is None or amount <= 0:
            return None, JsonResponse(
                {"error": "Укажите положительную сумму или список позиций"}, status=400
            )
        amount = amount.quantize(Decimal("0.01"))
        shares_in = data.get("shares") if isinstance(data.get("shares"), dict) else {}
        normalized = {}
        for mid in member_ids:
            try:
                normalized[mid] = float(shares_in.get(mid, 1))
            except (TypeError, ValueError):
                normalized[mid] = 1.0
        stored = []
    payer = User.objects.get(pk=payer_id)
    return (
        {
            "title": title[:300],
            "amount": amount,
            "payer": payer,
            "shares": normalized,
            "line_items": stored
            if isinstance(line_items, list) and len(line_items) > 0
            else [],
        },
        None,
    )


def _expenses_create(request, room_id):
    user, err = _require_auth(request)
    if err:
        return err
    room, e = _room_for_user(user, room_id)
    if e:
        return e
    data = _body(request)
    built, err_resp = _build_expense_from_body(room, data, user)
    if err_resp:
        return err_resp
    ex = Expense.objects.create(
        room=room,
        title=built["title"],
        amount=built["amount"],
        payer=built["payer"],
        shares=built["shares"],
        line_items=built["line_items"],
    )
    return JsonResponse(_expense_json(ex), status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def expense_detail(request, room_id, expense_id):
    user, err = _require_auth(request)
    if err:
        return err
    room, e = _room_for_user(user, room_id)
    if e:
        return e
    try:
        ex = Expense.objects.get(pk=expense_id, room=room)
    except Expense.DoesNotExist:
        return JsonResponse({"error": "Расход не найден"}, status=404)
    if request.method == "GET":
        return JsonResponse(_expense_json(ex))
    if request.method == "DELETE":
        ex.delete()
        return JsonResponse({"ok": True})
    data = _body(request)
    built, err_resp = _build_expense_from_body(room, data, user)
    if err_resp:
        return err_resp
    ex.title = built["title"]
    ex.amount = built["amount"]
    ex.payer = built["payer"]
    ex.shares = built["shares"]
    ex.line_items = built["line_items"]
    ex.save()
    return JsonResponse(_expense_json(ex))


@require_GET
def room_balance(request, room_id):
    user, err = _require_auth(request)
    if err:
        return err
    room, e = _room_for_user(user, room_id)
    if e:
        return e
    member_ids = [str(m.id) for m in room.members.all()]
    member_names = {
        str(m.id): (m.first_name or m.username) for m in room.members.all()
    }
    raw_bal = {mid: 0.0 for mid in member_ids}
    for ex in room.expenses.all():
        pid = str(ex.payer_id)
        raw_bal[pid] = raw_bal.get(pid, 0) + float(ex.amount)
        tw = sum(float(ex.shares.get(mid, 0) or 0) for mid in member_ids)
        if tw <= 0:
            continue
        for mid in member_ids:
            w = float(ex.shares.get(mid, 0) or 0)
            raw_bal[mid] -= float(ex.amount) * w / tw
    named = {
        member_names[k]: round(v, 2) for k, v in raw_bal.items()
    }
    transfers = simplify_debts(raw_bal)
    out_t = [
        {
            "from": member_names[str(t["from"])],
            "to": member_names[str(t["to"])],
            "amount": t["amount"],
        }
        for t in transfers
    ]
    vid = str(user.id)
    pay_to = []
    receive_from = []
    for t in transfers:
        fid, tid = str(t["from"]), str(t["to"])
        amt = t["amount"]
        if fid == vid:
            pay_to.append({"toName": member_names[tid], "amount": amt})
        if tid == vid:
            receive_from.append({"fromName": member_names[fid], "amount": amt})
    per_member = {}
    for mid in member_ids:
        pt = []
        rf = []
        for t in transfers:
            fid, tid = str(t["from"]), str(t["to"])
            amt = t["amount"]
            if fid == mid:
                pt.append({"toName": member_names[tid], "amount": amt})
            if tid == mid:
                rf.append({"fromName": member_names[fid], "amount": amt})
        per_member[member_names[mid]] = {"payTo": pt, "receiveFrom": rf}
    return JsonResponse(
        {
            "currency": room.currency,
            "balances": named,
            "transfers": out_t,
            "viewer": {
                "payTo": pay_to,
                "receiveFrom": receive_from,
            },
            "perMember": per_member,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def adhoc_split(request):
    data = _body(request)
    payer = (data.get("payer") or "").strip()
    currency = str(data.get("currency") or "RUB").upper()[:8]
    if currency not in ("RUB", "USD", "EUR"):
        currency = "RUB"
    products = data.get("products")
    line_items_store = []

    if isinstance(products, list) and len(products) > 0:
        owed = defaultdict(float)
        total = Decimal(0)
        all_names = set()
        for p in products:
            try:
                price = Decimal(str(p.get("price")))
            except (InvalidOperation, TypeError, ValueError):
                continue
            parts = [
                str(x).strip()
                for x in (p.get("participants") or [])
                if str(x).strip()
            ]
            parts = list(dict.fromkeys(parts))
            if not parts or price <= 0:
                continue
            total += price
            share = float(price) / len(parts)
            for n in parts:
                owed[n] += share
                all_names.add(n)
            line_items_store.append(
                {
                    "name": str(p.get("name") or "Позиция")[:200],
                    "price": float(price),
                    "participants": parts,
                }
            )
        if not payer or total <= 0 or not all_names:
            return JsonResponse(
                {"error": "Укажите плательщика и позиции с участниками"},
                status=400,
            )
        all_names.add(payer)
        amt = total.quantize(Decimal("0.01"))
        balances = {}
        for n in all_names:
            o = owed.get(n, 0.0)
            if n == payer:
                balances[n] = float(amt) - o
            else:
                balances[n] = -o
        all_names_list = list(all_names)
    else:
        try:
            amt = Decimal(str(data.get("amount")))
        except (InvalidOperation, TypeError, ValueError):
            amt = None
        parts = data.get("participants")
        names = (
            [str(n).strip() for n in parts if str(n).strip()]
            if isinstance(parts, list)
            else []
        )
        if not payer or not names or amt is None or amt <= 0:
            return JsonResponse(
                {"error": "Укажите плательщика, сумму и список участников"},
                status=400,
            )
        all_names_list = list(dict.fromkeys([payer, *names]))
        n = len(all_names_list)
        per = (amt / n).quantize(Decimal("0.01"))
        balances = {}
        for name in all_names_list:
            if name == payer:
                balances[name] = float(amt - per * (n - 1))
            else:
                balances[name] = float(-per)
        amt = amt.quantize(Decimal("0.01"))

    id_map = {name: f"g{i}" for i, name in enumerate(all_names_list)}
    raw = {id_map[n]: balances[n] for n in all_names_list}
    transfers = simplify_debts(raw)
    rev = {v: k for k, v in id_map.items()}
    out_transfers = [
        {"from": rev[t["from"]], "to": rev[t["to"]], "amount": t["amount"]}
        for t in transfers
    ]
    public_id = secrets.token_hex(6)[:12]
    while AdhocCalculation.objects.filter(public_id=public_id).exists():
        public_id = secrets.token_hex(6)[:12]
    AdhocCalculation.objects.create(
        public_id=public_id,
        payer=payer,
        amount=amt,
        participants=all_names_list,
        transfers=out_transfers,
        line_items=line_items_store,
        currency=currency,
    )
    return JsonResponse(
        {
            "id": public_id,
            "balances": balances,
            "transfers": out_transfers,
            "shareLink": f"/r/{public_id}",
            "currency": currency,
        }
    )


@require_GET
def adhoc_get(request, public_id):
    try:
        a = AdhocCalculation.objects.get(public_id=public_id)
    except AdhocCalculation.DoesNotExist:
        return JsonResponse({"error": "Не найдено"}, status=404)
    vid = request.GET.get("viewerName")
    pay_to = []
    receive_from = []
    if vid:
        for t in a.transfers:
            if t["from"] == vid:
                pay_to.append({"toName": t["to"], "amount": t["amount"]})
            if t["to"] == vid:
                receive_from.append({"fromName": t["from"], "amount": t["amount"]})
    return JsonResponse(
        {
            "payer": a.payer,
            "amount": float(a.amount),
            "participants": a.participants,
            "transfers": a.transfers,
            "lineItems": a.line_items or [],
            "currency": a.currency or "RUB",
            "viewer": {"payTo": pay_to, "receiveFrom": receive_from},
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def mock_parse_receipt(request):
    data = _body(request)
    file_name = data.get("fileName")
    note = (
        f"Демо-разбор для «{file_name}». Подключите внешний API OCR для реальных чеков."
        if file_name
        else "Демо-данные. Подключите внешний API OCR."
    )
    return JsonResponse(
        {
            "items": [
                {"name": "Позиция 1", "qty": 1, "price": 120.5},
                {"name": "Позиция 2", "qty": 2, "price": 89.0},
            ],
            "note": note,
        }
    )
