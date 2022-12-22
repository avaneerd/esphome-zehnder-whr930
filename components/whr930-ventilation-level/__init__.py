import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import CONF_ID

CONF_WHR930_ID = "whr930_id"
CONF_WHR930_VENTILATION_LEVEL_ID = "whr930_ventilation_level_id"

whr930_ns = cg.esphome_ns.namespace("whr930")

Whr930VentilationLevelComponent = whr930_ns.class_(
    "Whr930VentilationLevelComponent", cg.PollingComponent
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(Whr930VentilationLevelComponent),
    }
).extend(cv.polling_component_schema('60s'))

async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)