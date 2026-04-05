from django.db import migrations, models


def seed_texts(apps, schema_editor):
    TextResource = apps.get_model("core", "TextResource")
    rows = [
        ("nav.calc", "Расчёт", "Calculator"),
        ("nav.rooms", "Комнаты", "Rooms"),
        ("nav.contacts", "Контакты", "Contacts"),
        ("nav.profile", "Профиль", "Profile"),
        ("nav.settings", "Настройки", "Settings"),
        ("nav.logout", "Выйти", "Log out"),
        ("nav.login", "Вход", "Log in"),
        ("nav.register", "Регистрация", "Sign up"),
        ("common.save", "Сохранить", "Save"),
        ("common.cancel", "Отмена", "Cancel"),
        ("common.add", "Добавить", "Add"),
        ("common.delete", "Удалить", "Delete"),
        ("common.edit", "Изменить", "Edit"),
        ("common.close", "Закрыть", "Close"),
        ("room.title", "Комната", "Room"),
        ("room.members", "Участники", "Members"),
        ("room.inviteByName", "Пригласить по имени", "Invite by name"),
        ("room.inviteByCode", "Или по коду из профиля", "Or by profile code"),
        ("room.newExpense", "Создать расход", "New expense"),
        ("room.history", "История расходов", "Expense history"),
        ("room.youPay", "Вы переводите", "You send"),
        ("room.youReceive", "Вам переводят", "You receive"),
        ("room.balanceHint", "Кому и сколько отправить", "Who to pay and how much"),
        ("settings.title", "Настройки", "Settings"),
        ("settings.lang", "Язык", "Language"),
        ("settings.theme", "Тема", "Theme"),
        ("settings.themeLight", "Светлая", "Light"),
        ("settings.themeDark", "Тёмная", "Dark"),
        ("settings.accent", "Акцент", "Accent"),
        ("calc.title", "Разовый расход", "One-time split"),
        ("calc.participants", "Участники", "People"),
        ("calc.products", "Позиции", "Items"),
        ("calc.payer", "Кто оплатил", "Who paid"),
        ("calc.submit", "Рассчитать", "Calculate"),
        ("currency.rub", "₽ RUB", "₽ RUB"),
        ("currency.usd", "$ USD", "$ USD"),
        ("currency.eur", "€ EUR", "€ EUR"),
    ]
    for key, ru, en in rows:
        TextResource.objects.update_or_create(key=key, defaults={"ru": ru, "en": en})


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_user_profile"),
    ]

    operations = [
        migrations.CreateModel(
            name="TextResource",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("key", models.SlugField(db_index=True, max_length=120, unique=True)),
                ("ru", models.TextField()),
                ("en", models.TextField()),
            ],
            options={"db_table": "core_textresource"},
        ),
        migrations.AddField(
            model_name="room",
            name="currency",
            field=models.CharField(default="RUB", max_length=8),
        ),
        migrations.AddField(
            model_name="expense",
            name="line_items",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="user",
            name="accent",
            field=models.CharField(default="mint", max_length=24),
        ),
        migrations.AddField(
            model_name="user",
            name="preferred_language",
            field=models.CharField(default="ru", max_length=8),
        ),
        migrations.AddField(
            model_name="user",
            name="theme",
            field=models.CharField(default="light", max_length=16),
        ),
        migrations.AddField(
            model_name="adhoccalculation",
            name="currency",
            field=models.CharField(default="RUB", max_length=8),
        ),
        migrations.AddField(
            model_name="adhoccalculation",
            name="line_items",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(seed_texts, migrations.RunPython.noop),
    ]
