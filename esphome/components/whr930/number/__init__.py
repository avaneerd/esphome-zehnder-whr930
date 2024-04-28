import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import number
from esphome.const import (
    CONF_ID,
    CONF_UNIT_OF_MEASUREMENT,
    UNIT_CELSIUS,
    CONF_ACCURACY_DECIMALS,
    ENTITY_CATEGORY_CONFIG
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

Whr930ComfortTemperature = whr930_ns.class_(
    "Whr930ComfortTemperature", cg.PollingComponent, number.Number
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.All(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930ComfortTemperature),
        cv.Required("comfort_temperature"): number.number_schema(
            Whr930ComfortTemperature,
            unit_of_measurement=UNIT_CELSIUS,
            entity_category=ENTITY_CATEGORY_CONFIG
        ).extend({
                cv.Optional(CONF_ACCURACY_DECIMALS, default=0): cv.int_
        })
    }
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    id = config[CONF_ID]
    conf = config["comfort_temperature"]
    var = cg.new_Pvariable(id, parent)
    await cg.register_component(var, conf)
    await number.register_number(var, conf, min_value=15, max_value=25, step=1)