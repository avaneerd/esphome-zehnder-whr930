import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor, uart
from esphome.const import (
    CONF_ID,
    CONF_UART_ID,
    DEVICE_CLASS_EMPTY,
    STATE_CLASS_MEASUREMENT,
    UNIT_EMPTY,
)

from . import CONF_WHR930_ID, Whr930

ICON_FAN = "mdi:fan"

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.Optional("ventilation_level"): sensor.sensor_schema(
            unit_of_measurement=UNIT_EMPTY,
            icon=ICON_FAN,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_EMPTY,
            state_class=STATE_CLASS_MEASUREMENT,
        )
    }
).extend(uart.UART_DEVICE_SCHEMA)

async def to_code(config):
    hub = await cg.get_variable(config[CONF_WHR930_ID])

    sensors = []
    for key, conf in config.items():
        if not isinstance(conf, dict):
            continue
        id = conf[CONF_ID]
        if id and id.type == sensor.Sensor:
            sens = await sensor.new_sensor(conf)
            cg.add(getattr(hub, f"set_{key}")(sens))
            sensors.append(f"F({key})")