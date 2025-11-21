import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import text_sensor
from esphome.const import (
    CONF_ID,
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

Whr930FilterStatus = whr930_ns.class_(
    "Whr930FilterStatus", cg.PollingComponent
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930FilterStatus),
        cv.Optional("filter_status"): text_sensor.text_sensor_schema().extend(
            cv.COMPONENT_SCHEMA),
    }
)

async def to_code(config):
    id = config[CONF_ID]
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(id, parent)
    await cg.register_component(var, config)

    if "filter_status" in config:
        conf = config["filter_status"]
        sens = await text_sensor.new_text_sensor(conf)
        cg.add(var.set_filter_status_sensor(sens))
