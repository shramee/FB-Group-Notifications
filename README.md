# Facebook Group notifications with Angular

IIRC, it let's you pick from groups you have joined... You are then notified about activity on those groups...

I think (if we implemented that feature) it also lets you set a search term you are interested in...
So for example, maybe you are looking forward to buying a VW Beetle...
So you could monitor relevant groups to notify you as soon as anyone posts anything containing keyword `beetle` on groups you have chosen...

It was intended to be a Chrome Extension... But it was against FB policies (no scraping) and private group posts are not accessible via Graph API even when user authenticated is a member of the group...
And several groups are well... not public... So unfortunately it never made it to the market...
At the moment, I think it looks into both public and private groups...
There is a `.crx` version iin the root, feel free to try that if you like.

## Extending/Tweaking app

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

## Facebook error :scream:

You will need to register an app with FaceBook (To use FB graph API). Register the app and put app creds in...

1. https://github.com/shramee/FB-Group-Notifications/blob/master/src/app/data.service.ts#L46
2. https://github.com/shramee/FB-Group-Notifications/blob/master/src/app/login/login.component.html#L5
