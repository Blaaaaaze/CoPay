import secrets
import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField("Телефон", max_length=32, blank=True, default="")
    invite_code = models.CharField(
        max_length=16, unique=True, editable=False, db_index=True
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    preferred_language = models.CharField(max_length=8, default="ru")
    theme = models.CharField(max_length=16, default="light")
    accent = models.CharField(max_length=24, default="mint")

    class Meta:
        db_table = "core_user"

    @staticmethod
    def generate_invite_code():
        for _ in range(40):
            code = secrets.token_hex(4).upper()
            if not User.objects.filter(invite_code=code).exists():
                return code
        return secrets.token_hex(8).upper()

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = User.generate_invite_code()
        super().save(*args, **kwargs)


class TextResource(models.Model):
    key = models.SlugField(max_length=120, unique=True, db_index=True)
    ru = models.TextField()
    en = models.TextField()

    class Meta:
        db_table = "core_textresource"

    def __str__(self):
        return self.key


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    currency = models.CharField(max_length=8, default="RUB")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rooms_created",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="rooms",
    )

    def __str__(self):
        return self.name


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=300)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses_paid",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses_created",
    )
    shares = models.JSONField(default=dict)
    line_items = models.JSONField(default=list, blank=True)
    disputes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.amount})"


class Settlement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="settlements")
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements_received",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements_recorded",
    )
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class RoomActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_activities",
    )
    kind = models.CharField(max_length=40, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AdhocCalculation(models.Model):
    public_id = models.CharField(max_length=16, unique=True, db_index=True)
    payer = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    participants = models.JSONField()
    transfers = models.JSONField()
    line_items = models.JSONField(default=list, blank=True)
    currency = models.CharField(max_length=8, default="RUB")
    created_at = models.DateTimeField(auto_now_add=True)
