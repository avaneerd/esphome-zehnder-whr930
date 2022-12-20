import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import uart
from esphome.const import CONF_ID, CONF_UART_ID

CODEOWNERS = ["@avaneerd"]
DEPENDENCIES = ["uart"]
AUTO_LOAD = ["sensor", "text_sensor"]

CONF_WHR930_VENTILATION_LEVEL_ID = "whr930_ventilation_level_id"

whr930_ns = cg.esphome_ns.namespace("whr930")

Whr930BaseComponent = whr930_ns.class_(
    "Whr930BaseComponent", cg.PollingComponent, uart.UARTDevice
)

Whr930VentilationLevelComponent = whr930_ns.class_(
    "Whr930VentilationLevelComponent", Whr930BaseComponent
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(Whr930VentilationLevelComponent),
    }
).extend(uart.UART_DEVICE_SCHEMA)


async def to_code(config):
    uart_component = await cg.get_variable(config[CONF_UART_ID])
    var = cg.new_Pvariable(config[CONF_ID], uart_component)
    await cg.register_component(var, config)