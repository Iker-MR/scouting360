from django.contrib import admin

from .models import Ojeador


@admin.register(Ojeador)
class OjeadorAdmin(admin.ModelAdmin):
    # Staff verify scouts by hand (FIFA licence, club email...) and grant premium from here.
    list_display = ["nombre", "organizacion", "usuario", "verificado", "plan", "creado"]
    list_filter = ["verificado", "plan"]
    list_editable = ["verificado", "plan"]
    search_fields = ["nombre", "organizacion", "usuario__username"]
