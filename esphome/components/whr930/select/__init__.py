import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import select
from esphome.const import CONF_ID

from .. import CONF_WHR930_ID, whr930_ns, Whr930

DEPENDENCIES = ["whr930"]

CONF_VENTILATION_LEVEL = "ventilation_level"

Whr930VentilationLevel = whr930_ns.class_(
    "Whr930VentilationLevel", cg.PollingComponent, select.Select
)

CONFIG_SCHEMA = cv.All(
    cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930VentilationLevel),
        cv.Required(CONF_VENTILATION_LEVEL): select.select_schema(
            Whr930VentilationLevel,
        ),
    }
    ).extend(cv.COMPONENT_SCHEMA)
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(config[CONF_ID], parent)
    await cg.register_component(var, config)
    conf = config[CONF_VENTILATION_LEVEL]
    await select.register_select(var, conf, options=["Auto", "Absent", "Low", "Medium", "High"])
