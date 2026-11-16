from rest_framework import mixins, permissions, viewsets

from .models import Jugador, Ojeador
from .permissions import IsOwnerOrReadOnly
from .roles import guardar_perfil_exclusivo
from .serializers import JugadorSerializer, OjeadorSerializer


class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.all()
    serializer_class = JugadorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_fields = ["posicion", "pierna_dominante", "disponible", "zona"]
    search_fields = ["nombre", "zona", "club_actual"]

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
