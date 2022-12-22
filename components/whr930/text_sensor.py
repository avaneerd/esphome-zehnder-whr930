import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import text_sensor
from esphome.const import (
    CONF_ID,
)

from . import CONF_WHR930_ID, Whr930

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.Optional("supply_fan_active"): text_sensor.text_sensor_schema(
            icon="mdi:fan-chevron-down"
        ),
    }
)

async def to_code(config):
    hub = await cg.get_variable(config[CONF_WHR930_ID])

    sensors = []
    for key, conf in config.items():
        if not isinstance(conf, dict):
            continue
        id = conf[CONF_ID]
        if id and id.type == text_sensor.TextSensor:
            sens = await text_sensor.new_text_sensor(conf)
            cg.add(getattr(hub, f"set_{key}")(sens))
            sensors.append(f"F({key})")