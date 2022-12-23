import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import fan
from esphome.const import (
    CONF_OUTPUT_ID,
    CONF_SPEED_COUNT,
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

Whr930SupplyFan = whr930_ns.class_(
    "Whr930SupplyFan", cg.PollingComponent, fan.Fan
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.All(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.Optional("supply_fan"): fan.FAN_SCHEMA.extend(
            {
                cv.GenerateID(CONF_OUTPUT_ID): cv.declare_id(Whr930SupplyFan),
                cv.Optional(CONF_SPEED_COUNT, default=45): cv.int_range(min=45, max=100),
            }
        ).extend(cv.COMPONENT_SCHEMA)
    }
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    for conf in config.items():
        if not isinstance(conf, dict):
            continue
        var = cg.new_Pvariable(config[CONF_OUTPUT_ID], parent)
        await cg.register_component(var, config)
        await fan.register_fan(var, config)