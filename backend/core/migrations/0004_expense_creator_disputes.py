from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def fill_created_by(apps, schema_editor):
    Expense = apps.get_model("core", "Expense")
    for ex in Expense.objects.all():
        if ex.payer_id is not None:
            ex.created_by_id = ex.payer_id
            ex.save(update_fields=["created_by"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_currency_lines_i18n_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="expenses_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="expense",
            name="disputes",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(fill_created_by, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="expense",
            name="created_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="expenses_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
