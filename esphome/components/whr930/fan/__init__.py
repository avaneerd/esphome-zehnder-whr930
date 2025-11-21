import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import fan

from .. import CONF_WHR930_ID, whr930_ns, Whr930

CONF_FAN_TYPE = 'type'

FanType = whr930_ns.enum("FanType")
FAN_TYPE_ENUM = {
    "EXHAUST": FanType.EXHAUST,
    "SUPPLY": FanType.SUPPLY,
    "BOTH": FanType.BOTH,
}

Whr930Fan = whr930_ns.class_(
    "Whr930Fan", cg.PollingComponent, fan.Fan
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.All(
    fan.fan_schema(Whr930Fan).extend(
    {
        cv.Required(CONF_FAN_TYPE): cv.enum(FAN_TYPE_ENUM, upper=True),
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930)
    }
    ).extend(cv.COMPONENT_SCHEMA)
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = await fan.new_fan(config, parent, config[CONF_FAN_TYPE])
    await cg.register_component(var, config)