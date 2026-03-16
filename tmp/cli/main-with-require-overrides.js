
/**
 * IMPORTANT: Do not modify this file.
 * This file allows the app to run without bundling in workspace libraries.
 * Must be contained in the ".nx" folder inside the output path.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const originalResolveFilename = Module._resolveFilename;
const distPath = __dirname;
const manifest = [{"module":"@lenserfight/features/threads","exactMatch":"libs/features/threads/src/index.js","pattern":"libs/features/threads/src/index.ts"},{"module":"@lenserfight/features/home","exactMatch":"libs/features/home/src/index.js","pattern":"libs/features/home/src/index.ts"},{"module":"@lenserfight/features/public","exactMatch":"libs/features/public/src/index.js","pattern":"libs/features/public/src/index.ts"},{"module":"@lenserfight/features/settings","exactMatch":"libs/features/settings/src/index.js","pattern":"libs/features/settings/src/index.ts"},{"module":"@lenserfight/features/share","exactMatch":"libs/features/share/src/index.js","pattern":"libs/features/share/src/index.ts"},{"module":"@lenserfight/features/waiting-list","exactMatch":"libs/features/waiting-list/src/index.js","pattern":"libs/features/waiting-list/src/index.ts"},{"module":"@lenserfight/features/feedback","exactMatch":"libs/features/feedback/src/index.js","pattern":"libs/features/feedback/src/index.ts"},{"module":"@lenserfight/features/generations","exactMatch":"libs/features/generations/src/index.js","pattern":"libs/features/generations/src/index.ts"},{"module":"@lenserfight/features/onboarding","exactMatch":"libs/features/onboarding/src/index.js","pattern":"libs/features/onboarding/src/index.ts"},{"module":"@lenserfight/features/prompts","exactMatch":"libs/features/prompts/src/index.js","pattern":"libs/features/prompts/src/index.ts"},{"module":"@lenserfight/features/tags","exactMatch":"libs/features/tags/src/index.js","pattern":"libs/features/tags/src/index.ts"},{"module":"@lenserfight/features/admin","exactMatch":"libs/features/admin/src/index.js","pattern":"libs/features/admin/src/index.ts"},{"module":"@lenserfight/features/auth","exactMatch":"libs/features/auth/src/index.js","pattern":"libs/features/auth/src/index.ts"},{"module":"@lenserfight/features/leaderboard","exactMatch":"libs/features/leaderboard/src/index.js","pattern":"libs/features/leaderboard/src/index.ts"},{"module":"@lenserfight/features/notifications","exactMatch":"libs/features/notifications/src/index.js","pattern":"libs/features/notifications/src/index.ts"},{"module":"@lenserfight/features/profile","exactMatch":"libs/features/profile/src/index.js","pattern":"libs/features/profile/src/index.ts"},{"module":"@lenserfight/features/shell","exactMatch":"libs/features/shell/src/index.js","pattern":"libs/features/shell/src/index.ts"},{"module":"@lenserfight/domain/prompts","exactMatch":"libs/domain/prompts/src/index.js","pattern":"libs/domain/prompts/src/index.ts"},{"module":"@lenserfight/domain/reactions","exactMatch":"libs/domain/reactions/src/index.js","pattern":"libs/domain/reactions/src/index.ts"},{"module":"@lenserfight/domain/tags","exactMatch":"libs/domain/tags/src/index.js","pattern":"libs/domain/tags/src/index.ts"},{"module":"@lenserfight/domain/threads","exactMatch":"libs/domain/threads/src/index.js","pattern":"libs/domain/threads/src/index.ts"},{"module":"@lenserfight/domain/user","exactMatch":"libs/domain/user/src/index.js","pattern":"libs/domain/user/src/index.ts"},{"module":"@lenserfight/utils/number","exactMatch":"libs/utils/number/src/index.js","pattern":"libs/utils/number/src/index.ts"},{"module":"@lenserfight/utils/dom","exactMatch":"libs/utils/dom/src/index.js","pattern":"libs/utils/dom/src/index.ts"},{"module":"@lenserfight/utils/text","exactMatch":"libs/utils/text/src/index.js","pattern":"libs/utils/text/src/index.ts"},{"module":"@lenserfight/infra/analytics","exactMatch":"libs/infra/analytics/src/index.js","pattern":"libs/infra/analytics/src/index.ts"},{"module":"@lenserfight/infra/moderation","exactMatch":"libs/infra/moderation/src/index.js","pattern":"libs/infra/moderation/src/index.ts"},{"module":"@lenserfight/utils/date","exactMatch":"libs/utils/date/src/index.js","pattern":"libs/utils/date/src/index.ts"},{"module":"@lenserfight/utils/env","exactMatch":"libs/utils/env/src/index.js","pattern":"libs/utils/env/src/index.ts"},{"module":"@lenserfight/utils/storage","exactMatch":"libs/utils/storage/src/index.js","pattern":"libs/utils/storage/src/index.ts"},{"module":"@lenserfight/utils/validation","exactMatch":"libs/utils/validation/src/index.js","pattern":"libs/utils/validation/src/index.ts"},{"module":"@lenserfight/data/cache","exactMatch":"libs/data/cache/src/index.js","pattern":"libs/data/cache/src/index.ts"},{"module":"@lenserfight/data/repositories","exactMatch":"libs/data/repositories/src/index.js","pattern":"libs/data/repositories/src/index.ts"},{"module":"@lenserfight/data/supabase","exactMatch":"libs/data/supabase/src/index.js","pattern":"libs/data/supabase/src/index.ts"},{"module":"@lenserfight/ui/components","exactMatch":"libs/ui/components/src/index.js","pattern":"libs/ui/components/src/index.ts"},{"module":"@lenserfight/ui/forms","exactMatch":"libs/ui/forms/src/index.js","pattern":"libs/ui/forms/src/index.ts"},{"module":"@lenserfight/ui/layout","exactMatch":"libs/ui/layout/src/index.js","pattern":"libs/ui/layout/src/index.ts"},{"module":"@lenserfight/ui/modals","exactMatch":"libs/ui/modals/src/index.js","pattern":"libs/ui/modals/src/index.ts"},{"module":"@lenserfight/ui/theme","exactMatch":"libs/ui/theme/src/index.js","pattern":"libs/ui/theme/src/index.ts"},{"module":"@lenserfight/types","exactMatch":"libs/types/src/index.js","pattern":"libs/types/src/index.ts"},{"module":"@/*","pattern":"./*"},{"module":"user","exactMatch":"libs/domain/user/src/index.js","pattern":"libs/domain/user/src/index.ts"},{"module":"prompts","exactMatch":"libs/domain/prompts/src/index.js","pattern":"libs/domain/prompts/src/index.ts"},{"module":"threads","exactMatch":"libs/domain/threads/src/index.js","pattern":"libs/domain/threads/src/index.ts"},{"module":"tags","exactMatch":"libs/domain/tags/src/index.js","pattern":"libs/domain/tags/src/index.ts"},{"module":"reactions","exactMatch":"libs/domain/reactions/src/index.js","pattern":"libs/domain/reactions/src/index.ts"},{"module":"auth","exactMatch":"libs/features/auth/src/index.js","pattern":"libs/features/auth/src/index.ts"},{"module":"profile","exactMatch":"libs/features/profile/src/index.js","pattern":"libs/features/profile/src/index.ts"},{"module":"leaderboard","exactMatch":"libs/features/leaderboard/src/index.js","pattern":"libs/features/leaderboard/src/index.ts"},{"module":"notifications","exactMatch":"libs/features/notifications/src/index.js","pattern":"libs/features/notifications/src/index.ts"},{"module":"admin","exactMatch":"libs/features/admin/src/index.js","pattern":"libs/features/admin/src/index.ts"},{"module":"components","exactMatch":"libs/ui/components/src/index.js","pattern":"libs/ui/components/src/index.ts"},{"module":"layout","exactMatch":"libs/ui/layout/src/index.js","pattern":"libs/ui/layout/src/index.ts"},{"module":"forms","exactMatch":"libs/ui/forms/src/index.js","pattern":"libs/ui/forms/src/index.ts"},{"module":"modals","exactMatch":"libs/ui/modals/src/index.js","pattern":"libs/ui/modals/src/index.ts"},{"module":"theme","exactMatch":"libs/ui/theme/src/index.js","pattern":"libs/ui/theme/src/index.ts"},{"module":"supabase","exactMatch":"libs/data/supabase/src/index.js","pattern":"libs/data/supabase/src/index.ts"},{"module":"repositories","exactMatch":"libs/data/repositories/src/index.js","pattern":"libs/data/repositories/src/index.ts"},{"module":"cache","exactMatch":"libs/data/cache/src/index.js","pattern":"libs/data/cache/src/index.ts"},{"module":"date","exactMatch":"libs/utils/date/src/index.js","pattern":"libs/utils/date/src/index.ts"},{"module":"validation","exactMatch":"libs/utils/validation/src/index.js","pattern":"libs/utils/validation/src/index.ts"},{"module":"env","exactMatch":"libs/utils/env/src/index.js","pattern":"libs/utils/env/src/index.ts"},{"module":"storage","exactMatch":"libs/utils/storage/src/index.js","pattern":"libs/utils/storage/src/index.ts"},{"module":"types","exactMatch":"libs/types/src/index.js","pattern":"libs/types/src/index.ts"},{"module":"contracts","exactMatch":"libs/api/contracts/src/index.js","pattern":"libs/api/contracts/src/index.ts"},{"module":"dto","exactMatch":"libs/api/dto/src/index.js","pattern":"libs/api/dto/src/index.ts"},{"module":"analytics","exactMatch":"libs/infra/analytics/src/index.js","pattern":"libs/infra/analytics/src/index.ts"},{"module":"moderation","exactMatch":"libs/infra/moderation/src/index.js","pattern":"libs/infra/moderation/src/index.ts"}];

Module._resolveFilename = function(request, parent) {
  let found;
  for (const entry of manifest) {
    if (request === entry.module && entry.exactMatch) {
      const entry = manifest.find((x) => request === x.module || request.startsWith(x.module + "/"));
      const candidate = path.join(distPath, entry.exactMatch);
      if (isFile(candidate)) {
        found = candidate;
        break;
      }
    } else {
      const re = new RegExp(entry.module.replace(/\*$/, "(?<rest>.*)"));
      const match = request.match(re);

      if (match?.groups) {
        const candidate = path.join(distPath, entry.pattern.replace("*", ""), match.groups.rest);
        if (isFile(candidate)) {
          found = candidate;
        }
      }

    }
  }
  if (found) {
    const modifiedArguments = [found, ...[].slice.call(arguments, 1)];
    return originalResolveFilename.apply(this, modifiedArguments);
  } else {
    return originalResolveFilename.apply(this, arguments);
  }
};

function isFile(s) {
  try {
    require.resolve(s);
    return true;
  } catch (_e) {
    return false;
  }
}

// Call the user-defined main.
module.exports = require('./apps/cli/src/main.js');
