export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BnmSjsd8.js",app:"_app/immutable/entry/app.CMllrUO2.js",imports:["_app/immutable/entry/start.BnmSjsd8.js","_app/immutable/chunks/BUIqLoyu.js","_app/immutable/chunks/JEtx2HSH.js","_app/immutable/entry/app.CMllrUO2.js","_app/immutable/chunks/JEtx2HSH.js","_app/immutable/chunks/BpXqvP6r.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
