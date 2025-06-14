<template>
  <q-page id="config-page">
    <div class="q-pa-md">
      <q-tabs no-caps mobile-arrows dense align="left">
        <q-route-tab
          v-for="(element, index) in configurables"
          :key="index"
          :to="{ name: 'config', params: { section: element } }"
          :label="element.replace(/_/g, ' ').split('.').pop()"
          replace
          style="text-transform: capitalize"
        />
        <!-- Tab Manual tambahan -->
        <q-route-tab
          :to="{ name: 'config', params: { section: 'custom_manual' } }"
          label="Config Custom"
          replace
          style="text-transform: capitalize"
        />
      </q-tabs>

      <json-forms
        v-if="!isLoadingState && schema && selected_configuration !== 'custom_manual'"
        :data="configuration"
        :ajv="ajv"
        :renderers="renderers"
        :schema="schema"
        :uischema="cuischema"
        @change="onChange"
      />

      <div v-else-if="isLoadingState && selected_configuration !== 'custom_manual'" class="q-pa-md flex flex-center">
        <div>
          <q-spinner-gears size="xl" color="primary" />
        </div>
      </div>

      <q-page-sticky position="bottom-right" class="q-ma-lg">
        <div class="row self-end items-end">
          <!-- linter error, see open issue: https://github.com/intlify/vue-i18n-next/issues/1403-->
          <q-btn no-caps class="q-ml-sm" :label="$t('BTN_LABEL_RESET_CONFIG')" @click="confirm_reset_config = true" />
          <q-btn no-caps class="q-ml-sm" :label="$t('BTN_LABEL_RELOAD_CONFIG')" @click="updateFormSchema()" />
          <div class="q-ml-sm column">
            <q-toggle v-model="autoReloadServicesOnSave" :label="$t('Apply')">
              <q-tooltip>{{ $t('Reload services on save to apply settings. Reloading might take some time.') }} </q-tooltip>
            </q-toggle>
            <q-btn no-caps color="primary" :label="$t('BTN_LABEL_PERSIST_CONFIG')" @click="saveConfig()" />
          </div>
        </div>
      </q-page-sticky>

      <q-dialog v-model="confirm_reset_config">
        <q-card class="q-pa-sm" style="min-width: 350px">
          <q-card-section class="row items-center" style="flex-wrap: nowrap">
            <q-avatar icon="sym_o_delete" color="negative" text-color="white" />
            <p class="q-ml-sm">
              {{
                $t('Are you sure that you want to delete the configuration for {selected_configuration} and reset to the defaults?', {
                  selected_configuration: selected_configuration,
                })
              }}
            </p>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn no-caps v-close-popup flat :label="$t('BTN_LABEL_CANCEL')" color="primary" />
            <q-btn
              no-caps
              v-close-popup
              :label="$t('yes, reset')"
              color="negative"
              @click="[remoteProcedureCall(`/api/admin/config/${selected_configuration}`, 'DELETE'), updateFormSchema()]"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { ref, provide, onBeforeMount, watch } from 'vue'
import { JsonForms, type JsonFormsChangeEvent } from '@jsonforms/vue'
import { generateDefaultUISchema } from '@jsonforms/core'
import { defaultStyles, mergeStyles, createAjv, quasarRenderers } from '../components/form'
import { remoteProcedureCall, _fetch } from '../util/fetch_api'
import { useConfigurationStore } from '../stores/configuration-store'
import { Notify } from 'quasar'
import { useRoute } from 'vue-router'
import type { components } from '../dto/api'
import { useLocalStorage } from '@vueuse/core'

// bind object

const autoReloadServicesOnSave = useLocalStorage('autoReloadServicesOnSave', true)
const route = useRoute()
const configurationStore = useConfigurationStore()
const isLoadingState = ref(true)
const confirm_reset_config = ref(false)

const configurables = ref([])
const selected_configuration = ref('')

const configuration = ref({})
const schema = ref({})
const cuischema = ref(generateDefaultUISchema({}))
const ajv = createAjv({ multipleOfPrecision: 2, useDefaults: false, removeAdditional: false }) // https://ajv.js.org/options.html#usedefaults // https://ajv.js.org/json-schema.html#discriminator use in future?
const renderers = Object.freeze([...quasarRenderers])
const myStyles = mergeStyles(defaultStyles, { control: { label: 'q-label' } })
provide('styles', myStyles)

onBeforeMount(() => {
  const section = (route.params.section as string) || 'app'

  selected_configuration.value = section
  getConfigurables()
  updateFormSchema()
})
watch(route, (to) => {
  const section = (to.params.section as string) || 'app'
  selected_configuration.value = section

  //TODO: if route different, ask if config if config loss is acceptable if changed. if so, stop router change.

  updateFormSchema()
})
const onChange = (event: JsonFormsChangeEvent) => {
  configuration.value = event.data
}

const getSchema = async () => {
  try {
    if (selected_configuration.value === 'custom_manual') {
      return {
        type: 'object',
        properties: {},
      }
    }

    const response = await _fetch(`/api/admin/config/${selected_configuration.value}/schema?schema_type=dereferenced`)
    console.log(response)
    if (!response.ok) {
      throw new Error('Server returned ' + response.status)
    }
    return await response.json()
  } catch (err) {
    console.warn(err)

    Notify.create({
      message: String(err),
      caption: 'Error getting configuration schema',
      color: 'negative',
    })
    // fallback supaya form gak error
    return {
      type: 'object',
      properties: {},
    }
  }
}

const updateFormSchema = async () => {
  //loadscreen on
  isLoadingState.value = true

  schema.value = await getSchema()
  cuischema.value = generateDefaultUISchema(schema.value, 'TopLevelNavigation')

  configuration.value = await getConfig() //reload because store could have all data but with usercontext so secrets hidden

  isLoadingState.value = false
}

const getConfigurables = async () => {
  try {
    const response = await _fetch('/api/admin/config/list')

    configurables.value = await response.json()
    console.log(configurables.value)
  } catch (error) {
    console.warn(error)

    Notify.create({
      message: String(error),
      caption: 'Error getting configurables!',
      color: 'red',
    })
  } finally {
    // commit('setLoading', false);
  }
}

const getConfig = async () => {
  try {
    if (selected_configuration.value === 'custom_manual') {
      return {
        data: {
          username: 'admin',
          email: 'admin@example.com',
          notifications: true,
          preferences: {
            theme: 'dark',
            language: 'id',
          },
          items: [
            { id: 1, name: 'Item A' },
            { id: 2, name: 'Item B' },
          ],
        },
      }
    }
    const response = await _fetch(`/api/admin/config/${selected_configuration.value}`)
    if (!response.ok) {
      throw new Error('Server returned ' + response.status)
    }
    return await response.json()
  } catch (error) {
    console.warn(error)

    Notify.create({
      message: String(error),
      caption: 'Error getting config!',
      color: 'negative',
    })

    // fallback supaya gak undefined dan mencegah error
    return {
      data: {},
    }
  }
}

// actions
const saveConfig = async () => {
  console.log('sync config to server')
  console.log(configuration.value)

  try {
    const response = await _fetch(`/api/admin/config/${selected_configuration.value}?reload=${autoReloadServicesOnSave.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configuration.value),
    })

    if (response.ok) {
      // if HTTP-status is 200-299
      // reload configuration again because some default values could be set by server during processing
      configuration.value = await getConfig()

      if (selected_configuration.value == 'app') {
        // 'app' means AppConfig is selected. For AppConfig the data is stored in the pinia store and updated here.
        configurationStore.configuration = configuration.value as components['schemas']['AppConfig']
        configurationStore.postConfigchanged()
      }

      let message = 'Configuration saved.'
      if (autoReloadServicesOnSave.value) {
        message = 'Configuration saved and applied by reloading services.'
      }
      Notify.create({
        message: message,
        color: 'positive',
      })
    } else {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      interface ResponseErrorData {
        detail: {
          loc: string[]
          msg: string
        }[]
      }
      // https://kentcdodds.com/blog/using-fetch-with-type-script
      const json: ResponseErrorData = await response.json()

      let notify_msg = ''
      Object.values(json.detail).forEach((detail) => {
        notify_msg += `${detail['msg']}: ${detail['loc'].join('→')}<br/>`
      })

      Notify.create({
        caption: 'Configuration Validation Error',
        icon: 'sym_o_error',
        html: true,
        message: notify_msg,
        color: 'negative',
      })
      return
    }
  } catch (error) {
    console.error(error)
    Notify.create({
      message: String(error),
      caption: 'Error saving config',
      color: 'negative',
    })
  }
}
</script>
<style lang="scss">
.control-wrapper {
  margin-bottom: 10px;
}

.control-wrapper .control-description-wrapper,
.array-list-description {
  color: $grey;
}
</style>
