from rest_framework import mixins, permissions, viewsets

from .contacto import iniciar_conversacion
from .models import Conversacion, Jugador, Ojeador
from .permissions import IsOwnerOrReadOnly
from .roles import guardar_perfil_exclusivo
from .serializers import IniciarConversacionSerializer, JugadorSerializer, OjeadorSerializer


class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.all()
    serializer_class = JugadorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_fields = ["posicion", "pierna_dominante", "disponible", "zona"]
    # Not "nombre": searching the stored full name would confirm the surname
    # that the public profile hides.
    search_fields = ["zona", "club_actual"]

    def perform_create(self, serializer):
        guardar_perfil_exclusivo(serializer, self.request.user)


class OjeadorViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Scout profiles. No list on purpose: we do not publish a scout directory."""

    queryset = Ojeador.objects.all()
    serializer_class = OjeadorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        guardar_perfil_exclusivo(serializer, self.request.user)


class ConversacionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Scout -> player conversations. Only starting one for now (quota and minors rules)."""

    queryset = Conversacion.objects.all()
    serializer_class = IniciarConversacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.instance = iniciar_conversacion(
            usuario=self.request.user,
            jugador=serializer.validated_data["jugador"],
            texto=serializer.validated_data["texto"],
        )
