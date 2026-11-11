from rest_framework import serializers

from .models import Atributos, Jugador


class AtributosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atributos
        fields = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico"]


class JugadorSerializer(serializers.ModelSerializer):
    # Players never rate themselves: atributos are set by scouts.
    atributos = AtributosSerializer(read_only=True)
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
