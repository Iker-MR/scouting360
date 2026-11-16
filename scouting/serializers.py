from rest_framework import serializers

from .models import Jugador, Ojeador


class OjeadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ojeador
        fields = ["id", "nombre", "organizacion", "verificado"]
        # Verification is a staff decision made in the admin, never by the scout.
        read_only_fields = ["verificado"]


class JugadorSerializer(serializers.ModelSerializer):
    posicion_display =serializers.CharField(source="get_posicion_display", read_only=True)

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
            "creado",
        ]
        # The owner comes from the authenticated request, never from the payload.
        read_only_fields = ["usuario", "creado"]
