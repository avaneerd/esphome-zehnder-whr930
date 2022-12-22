import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    CONF_ID,
    DEVICE_CLASS_EMPTY,
    STATE_CLASS_MEASUREMENT,
    UNIT_EMPTY,
)

whr930_ns = cg.esphome_ns.namespace("whr930")

Whr930VentilationLevel = whr930_ns.class_(
    "Whr930VentilationLevel", cg.PollingComponent
)

CONF_WHR930_VENTILATION_LEVEL_ID = "whr930_ventilation_level_id"

DEPENDENCIES = ["whr930"]

ICON_FAN = "mdi:fan"

CONFIG_SCHEMA = sensor.sensor_schema(
    unit_of_measurement=UNIT_EMPTY,
    icon=ICON_FAN,
    accuracy_decimals=0,
    device_class=DEVICE_CLASS_EMPTY,
    state_class=STATE_CLASS_MEASUREMENT,
).extend({
    cv.GenerateID(): cv.declare_id(Whr930VentilationLevel)
})

async def to_code(config):
    hub = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(hub, config)