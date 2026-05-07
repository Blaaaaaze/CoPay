from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create/update demo users in local DB"

    def handle(self, *args, **options):
        User = get_user_model()

        users = [
            ("vera@ex.ru", "Example", "73E8A0E8"),
            ("dasha@ex.ru", "Example", "C62DDD32"),
            ("sasha@ex.ru", "Example", "3280C9BE"),
            ("masha@ex.ru", "Example", "4E1D2239"),
            ("mehri@ex.ru", "Example", "A1EA0C4E"),
            ("nastya@ex.ru", "Example", "DBEE5616"),
        ]

        for email, password, invite_code in users:
            email = (email or "").strip().lower()
            invite_code = (invite_code or "").strip().upper()
            if not email or not invite_code:
                self.stderr.write(self.style.ERROR(f"Skip invalid row: {email!r} {invite_code!r}"))
                continue

            existing_code_owner = User.objects.filter(invite_code=invite_code).exclude(username__iexact=email).first()
            if existing_code_owner:
                self.stderr.write(
                    self.style.ERROR(
                        f"Invite code {invite_code} already used by {existing_code_owner.username}; skip {email}"
                    )
                )
                continue

            u = User.objects.filter(username__iexact=email).first()
            if not u:
                u = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=email.split("@", 1)[0],
                    last_name="",
                )
                created = True
            else:
                created = False
                if getattr(u, "email", "") != email:
                    u.email = email
                u.first_name = u.first_name or email.split("@", 1)[0]
                u.set_password(password)

            u.invite_code = invite_code
            u.is_active = True
            u.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"{'CREATED' if created else 'UPDATED'}: {email} / {password} / {invite_code}"
                )
            )

