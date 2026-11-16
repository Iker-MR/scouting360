from rest_framework.routers import DefaultRouter

from .views import ConversacionViewSet, JugadorViewSet, OjeadorViewSet

router = DefaultRouter()
router.register("jugadores", JugadorViewSet)
router.register("ojeadores", OjeadorViewSet)
router.register("conversaciones", ConversacionViewSet)

urlpatterns = router.urls
