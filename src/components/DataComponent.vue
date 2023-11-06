<script setup lang="ts">
import "../style.css";
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import NoData from './NoDataComponent.vue';
let propties = defineProps({
    'lession' : String,
    'room' : String,
    'teacher' : String,
})

let hasData = propties.lession != undefined && propties.room != undefined && propties.teacher != undefined
</script>

<template>
    <div class="card" >
        <Card v-if="hasData" style="text-align: left;">
            <template #title> {{ propties.lession ?? 'None' }} </template>
            <template #subtitle><Divider></Divider></template>
            <template #content>
                <div style="display: grid; column-gap: 10px;">
                    <p style="text-align: left;">Room</p>
                    <p style="grid-column-start: 2; text-align: right;">{{ propties.room || '?' }}</p>
                    <p style="text-align: left;">Teacher</p>
                    <p style="grid-column-start: 2; text-align: right;">{{ propties.teacher || '?' }}</p>
                </div>
            </template>
        </Card>
        <NoData v-if="!hasData"></NoData>
    </div>
</template>

<style scoped>
.card{
    max-width: 200px;
    transform: scale(0.9);
}
.card:deep(.p-card .p-card-content){
    padding: 0 !important;
}

.p-divider.p-divider-horizontal:before{
    border-top: black solid 1px !important; 
}
</style>