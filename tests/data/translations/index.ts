import { toDotNotation } from '../../utils';

import * as common from './en/common.json';
import * as route from './en/route.json';
import * as common_ku from './ku/common.json';
import * as common_zhHans from './zh-Hans/common.json';

export default ({
  en: toDotNotation({
    common,
    route1: route,
    route2: route,
  }),
  'zh-Hans': toDotNotation({
    common: common_zhHans,
  }),
  ku: toDotNotation({
    common: common_ku,
  }),
}) as Record<string, any>;