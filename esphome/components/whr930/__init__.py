import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import uart
from esphome.const import (
    CONF_ID,
    CONF_UART_ID
)

CONF_WHR930_ID = "whr930_id"

whr930_ns = cg.esphome_ns.namespace("whr930")

Whr930 = whr930_ns.class_(
    "Whr930", cg.PollingComponent, uart.UARTDevice
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(Whr930),
    }
).extend(uart.UART_DEVICE_SCHEMA)

async def to_code(config):
    uart_component = await cg.get_variable(config[CONF_UART_ID])
    hub = cg.new_Pvariable(config[CONF_ID], uart_component)
    await cg.register_component(hub, config)