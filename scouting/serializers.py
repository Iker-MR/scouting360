from django.db import transaction
from rest_framework import serializers

from .models import Atributos, Jugador


class AtributosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atributos
        fields = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico"]


class JugadorSerializer(serializers.ModelSerializer):
    atributos = AtributosSerializer(required=False, allow_null=True)
    overall = serializers.IntegerField(read_only=True)
    posicion_display = serializers.CharField(source="get_posicion_display", read_only=True)

    class Meta:
        model = Jugador
        fields = [
            "id",
            "usuario",
            "nombre",
            "fecha_nacimiento",
            "posicion",
            "posicion_display",
            "pierna_dominante",
            "zona",
            "club_actual",
            "disponible",
            "foto",
            "bio",
            "atributos",
            "overall",
            "creado",
        ]
        # The owner comes from the authenticated request, never from the payload.
        read_only_fields = ["usuario", "creado"]

    @transaction.atomic
    def create(self, validated_data):
        atributos_data = validated_data.pop("atributos", None)
        jugador = super().create(validated_data)
        if atributos_data is not None:
            Atributos.objects.create(jugador=jugador, **atributos_data)
        return jugador

    @transaction.atomic
    def update(self, instance, validated_data):
        atributos_data = validated_data.pop("atributos", None)
        jugador = super().update(instance, validated_data)
        if atributos_data is not None:
            Atributos.objects.update_or_create(jugador=jugador, defaults=atributos_data)
        return jugador
