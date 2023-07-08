import { toDotNotation } from '../../utils';

import { default as common } from './en/common.json';
import { default as route } from './en/route.json';
import { default as common_ku } from './ku/common.json';
import { default as common_zhHans } from './zh-Hans/common.json';

export default (preprocess = 'full') => {
  const en = {
    common,
    route1: route,
    route2: route,
  };

  const zhHans = {
    common: common_zhHans,
  };

  const ku = {
    common: common_ku,
  };

  return ({
    en: preprocess === 'none' ? en : toDotNotation(en, preprocess === 'preserveArays'),
    'zh-Hans': preprocess === 'none' ? zhHans : toDotNotation(zhHans, preprocess === 'preserveArays'),
    ku: preprocess === 'none' ? ku : toDotNotation(ku, preprocess === 'preserveArays'),
  }) as Record<string, any>;
};