import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import fan
from esphome.const import (
    CONF_ID,
    CONF_SPEED_COUNT,
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

CONF_FAN_TYPE = 'type'

FanType = whr930_ns.enum("FanType", is_class=True)
FAN_TYPE_ENUM = {
    "EXHAUST": FanType.EXHAUST,
    "SUPPLY": FanType.SUPPLY,
}

Whr930Fan = whr930_ns.class_(
    "Whr930Fan", cg.PollingComponent, fan.Fan
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.All(
    fan.FAN_SCHEMA.extend(
    {
        cv.GenerateID(): cv.declare_id(Whr930Fan),
        cv.Required(CONF_FAN_TYPE): cv.enum(FAN_TYPE_ENUM, upper=True),
        cv.Optional(CONF_SPEED_COUNT, default=100): cv.int_range(min=1, max=100),
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930)
    }
    ).extend(cv.COMPONENT_SCHEMA)
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    id = config[CONF_ID]
    var = cg.new_Pvariable(id, parent, config[CONF_FAN_TYPE])
    await cg.register_component(var, config)
    await fan.register_fan(var, config)