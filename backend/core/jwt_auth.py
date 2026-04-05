from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from .models import User


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "name": user.first_name or user.username,
        "exp": now + timedelta(days=7),
        "iat": now,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def user_from_request(request):
    h = request.META.get("HTTP_AUTHORIZATION", "")
    if not h.startswith("Bearer "):
        return None
    payload = verify_token(h[7:].strip())
    if not payload or "sub" not in payload:
        return None
    try:
        return User.objects.get(pk=payload["sub"])
    except User.DoesNotExist:
        return None
