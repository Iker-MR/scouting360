from rest_framework import serializers

from .models import Conversacion, Jugador, Ojeador


def es_dueno(context, usuario_id):
    # No request (scripts, other serializers) fails closed to the public view.
    request = context.get("request")
    return (
        request is not None
        and request.user.is_authenticated
        and request.user.pk == usuario_id
    )


class OjeadorSerializer(serializers.ModelSerializer):
    """The plan is the scout's commercial data: only its owner sees it."""

    class Meta:
        model = Ojeador
        fields = ["id", "nombre", "organizacion", "verificado", "plan"]
        # Verification and plan are staff decisions made in the admin, never by the scout.
        read_only_fields = ["verificado", "plan"]

    def to_representation(self, ojeador):
        data = super().to_representation(ojeador)
        if not es_dueno(self.context, ojeador.usuario_id):
            del data["plan"]
        return data


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
        if not es_dueno(self.context, jugador.usuario_id):
            data["nombre"] = jugador.nombre_publico()
            del data["fecha_nacimiento"]
        return data


class IniciarConversacionSerializer(serializers.ModelSerializer):
    """Input: the player and the first message. The scout comes from the request."""

    texto = serializers.CharField(write_only=True)

    class Meta:
        model = Conversacion
        fields = ["id", "jugador", "texto", "creada"]
        read_only_fields = ["creada"]
