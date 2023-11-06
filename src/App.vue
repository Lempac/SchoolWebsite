<script setup lang="ts">
import { ref } from "vue";
import DataComponent from './components/DataComponent.vue';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';

let kurss = ref();
let skolotajs = ref();
let kabinets = ref();
let dates = ref();
let time = ref();

</script>

<script lang="ts">
export default {
  data() {
    return {
      data: {} as { [key: string]: string[] },
    };
  },
  methods: {
    fetchData() {
      let url = new URL(window.location.href);
      const response = fetch(url, { method: "POST" });
      response.then(e => e.json().then(json => this.data = json));
    }
  },
  mounted() {
    this.fetchData()
  }
};
</script>

<template>
  <div class="inputArea">
    <Dropdown v-model="kurss" v-if="data['Classes']?.length" editable :options="data['Classes']" :placeholder="data['Classes'][0]"/>
    <Dropdown v-model="skolotajs" v-if="data['Teachers']?.length" editable :options="data['Teachers']" :placeholder="data['Teachers'][0]"/>
    <Dropdown v-model="kabinets" v-if="data['Rooms']?.length" editable :options="data['Rooms']" :placeholder="data['Rooms'][0]"/>
    <Dropdown v-model="kabinets" v-if="data['Subjects']?.length" editable :options="data['Subjects']" :placeholder="data['Subjects'][0]"/>
    <Calendar v-model="dates" selectionMode="range" inline showWeek/>
    <Calendar v-model="time" inputId="laiks" timeOnly/>
    <Dropdown v-model="kabinets" v-if="data['Buildings']?.length" editable :options="data['Buildings']" :placeholder="data['Buildings'][0]"/>
  </div>
  <div class="dataArea">
    <DataComponent v-for="index in 84" :lession="`${index % 7 || 7}`" :room="`${index}`" :teacher="`${index}`"></DataComponent>
  </div>
</template>

<style>
.inputArea {
  display: grid;
  row-gap: 15px;
  padding: 15px;
  margin-top: 25px;
  max-width: 600px;
  max-height: 1000px;
  border-radius: 10px;
  background-color: #575050;
  flex: 1;
}

.dataArea {
  display: grid;
  padding: 15px;
  flex: 1;
  grid-template-rows: auto auto auto auto auto auto auto;
  grid-auto-flow: column;
  background-color: gray;
}
</style>