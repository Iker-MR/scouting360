from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

User = get_user_model()

USERNAME_TAKEN = "Ya existe un usuario con ese nombre."


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate(self, attrs):
        # Validators such as UserAttributeSimilarityValidator need the user's
        # other fields, so password validation runs at object level.
        candidato = User(username=attrs["username"], email=attrs.get("email", ""))
        try:
            validate_password(attrs["password"], user=candidato)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        # The username unique constraint is the source of truth: the
        # serializer's UniqueValidator still races with concurrent requests.
        try:
            with transaction.atomic():
                return User.objects.create_user(**validated_data)
        except IntegrityError:
            raise serializers.ValidationError({"username": [USERNAME_TAKEN]})


class MeSerializer(serializers.ModelSerializer):
    jugador_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "jugador_id"]

    def get_jugador_id(self, user):
        # A user without a profile raises RelatedObjectDoesNotExist, which is
        # also an AttributeError, so getattr's default covers it.
        jugador = getattr(user, "jugador", None)
        return jugador.pk if jugador else None
