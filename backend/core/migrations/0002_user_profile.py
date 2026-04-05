import secrets

from django.db import migrations, models


def fill_invite_codes(apps, schema_editor):
    User = apps.get_model("core", "User")
    for u in User.objects.all():
        if u.invite_code:
            continue
        for _ in range(50):
            c = secrets.token_hex(4).upper()
            if not User.objects.filter(invite_code=c).exists():
                u.invite_code = c
                u.save(update_fields=["invite_code"])
                break


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(
                blank=True, default="", max_length=32, verbose_name="Телефон"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ImageField(blank=True, null=True, upload_to="avatars/"),
        ),
        migrations.AddField(
            model_name="user",
            name="invite_code",
            field=models.CharField(
                db_index=True, editable=False, max_length=16, null=True
            ),
        ),
        migrations.RunPython(fill_invite_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="invite_code",
            field=models.CharField(
                db_index=True, editable=False, max_length=16, unique=True
            ),
        ),
    ]
