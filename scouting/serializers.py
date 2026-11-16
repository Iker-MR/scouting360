from rest_framework import serializers

from .models import Jugador, Ojeador


class OjeadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ojeador
        fields = ["id", "nombre", "organizacion", "verificado"]
        # Verification is a staff decision made in the admin, never by the scout.
        read_only_fields = ["verificado"]


class JugadorSerializer(serializers.ModelSerializer):
    """Full profile for its owner; a trimmed public profile for everyone else.

    The public profile must not give a scout what they need to contact the
    player outside the platform, where contacts are not counted or moderated.
    The owner is never sent in the payload: it comes from the request.
    """

    posicion_display = serializers.CharField(source="get_posicion_display", read_only=True)
    edad = serializers.SerializerMethodField()

    class Meta:
        model = Jugador
        fields = [
            "id",
            "nombre",
            "fecha_nacimiento",
            "edad",
            "posicion",
            "posicion_display",
            "pierna_dominante",
            "zona",
            "club_actual",
            "disponible",
            "foto",
            "creado",
        ]
        read_only_fields = ["creado"]

    def get_edad(self, jugador):
        return jugador.edad()

    def to_representation(self, jugador):
        data = super().to_representation(jugador)
        if not self._es_dueno(jugador):
            data["nombre"] = jugador.nombre_publico()
            del data["fecha_nacimiento"]
        return data

    def _es_dueno(self, jugador):
        # No request (scripts, other serializers) fails closed to the public profile.
        request = self.context.get("request")
        return (
            request is not None
            and request.user.is_authenticated
            and request.user.pk == jugador.usuario_id
        )
