import { toDotNotation } from '../../../src/utils';
import type { DotNotationOutput } from '../../../src/types';

import * as common from './en/common.json';
import * as route from './en/route.json';
import * as common_cs from './cs/common.json';

export default ({
  en: toDotNotation({
    common,
    route1: route,
    route2: route,
  }),
  cs: toDotNotation({
    common: common_cs,
  }),
}) as Record<string, DotNotationOutput>;