from rest_framework import serializers

from .models import Jugador


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
