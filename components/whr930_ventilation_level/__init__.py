import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import CONF_ID

CODEOWNERS = ["@avaneerd"]
DEPENDENCIES = ["uart"]
AUTO_LOAD = ["sensor", "text_sensor"]

CONF_WHR930_VENTILATION_LEVEL_ID = "whr930_ventilation_level_id"

whr930_ventilation_level_ns = cg.esphome_ns.namespace("whr930_ventilation_level")

Whr930VentilationLevelComponent = whr930_ventilation_level_ns.class_(
    "Whr930VentilationLevelComponent", cg.Component
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(Whr930VentilationLevelComponent)
    }
)


def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    yield cg.register_component(var, config)