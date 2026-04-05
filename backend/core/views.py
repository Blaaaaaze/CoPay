import json
import uuid
from pathlib import Path

from django.contrib.auth import authenticate
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .jwt_auth import create_token, user_from_request
from .models import TextResource, User


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
