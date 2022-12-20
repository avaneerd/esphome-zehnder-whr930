import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    CONF_ID,
    DEVICE_CLASS_EMPTY,
    STATE_CLASS_MEASUREMENT,
    UNIT_EMPTY,
)
from esphome.core import coroutine

CONF_WHR930_ID = "whr930_id"
CONF_WHR930_VENTILATION_LEVEL_ID = "whr930_ventilation_level_id"

whr930_ns = cg.esphome_ns.namespace("whr930")

Whr930VentilationLevelComponent = whr930_ns.class_(
    "Whr930VentilationLevelComponent", cg.PollingComponent
)

DEPENDENCIES = ["whr930"]


CONF_VENTILATION_LEVEL = "ventilation_level"
CONF_SUPPLY_FAN_ACTIVE = "supply_fan_active"
ICON_FAN = "mdi:fan"
ICON_FAN_CHEVRON_DOWN = "mdi:fan-chevron-down"

TYPES = [
    CONF_VENTILATION_LEVEL,
    CONF_SUPPLY_FAN_ACTIVE,
]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_VENTILATION_LEVEL_ID): cv.use_id(Whr930VentilationLevelComponent),
        cv.Optional(CONF_VENTILATION_LEVEL): sensor.sensor_schema(
            unit_of_measurement=UNIT_EMPTY,
            icon=ICON_FAN,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_EMPTY,
            state_class=STATE_CLASS_MEASUREMENT,
        ),
        cv.Optional(CONF_SUPPLY_FAN_ACTIVE): sensor.sensor_schema(
            unit_of_measurement=UNIT_EMPTY,
            icon=ICON_FAN_CHEVRON_DOWN,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_EMPTY,
            state_class=STATE_CLASS_MEASUREMENT,
        )
    }
)


@coroutine
def setup_conf(config, key, hub):
    if key in config:
        conf = config[key]
        sens = yield sensor.new_sensor(conf)
        cg.add(getattr(hub, f"set_{key}_sensor")(sens))


async def to_code(config):
    hub = yield cg.get_variable(config[CONF_WHR930_VENTILATION_LEVEL_ID])
    for key in TYPES:
        yield setup_conf(config, key, hub)

    whr930_component = await cg.get_variable(config[CONF_WHR930_ID])
    cg.add(getattr(hub, f"set_whr930")(whr930_component))