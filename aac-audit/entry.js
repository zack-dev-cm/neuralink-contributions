// Match upstream bootstrap ordering: its model/service imports contain cycles.
import 'upstream/src/js/externals/jquery.js';
import { localStorageService } from 'upstream/src/js/service/data/localStorageService';
import SearchModal from 'upstream/src/vue-components/modals/searchModal.vue';
import GridView from 'upstream/src/vue-components/views/gridView.vue';
import { gridUtil } from 'upstream/src/js/util/gridUtil';
import { GridData } from 'upstream/src/js/model/GridData';
import { GridElement } from 'upstream/src/js/model/GridElement';
import { GridActionNavigate } from 'upstream/src/js/model/GridActionNavigate';
import { MetaData } from 'upstream/src/js/model/MetaData';
import Vue from 'upstream/node_modules/vue';
import VueI18n from 'upstream/node_modules/vue-i18n';
import { i18nService } from 'upstream/src/js/service/i18nService';
Vue.use(VueI18n);
window.AAC_AUDIT_READY = i18nService.getVueI18n();
window.AAC_AUDIT = {SearchModal, GridView, gridUtil, GridData, GridElement, GridActionNavigate, MetaData, localStorageService};
