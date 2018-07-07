(function($) {
	let defaults = {
			regex: '([a-zA-Z0-9_@:!]){4}([a-zA-Z]){2}([0-9]){2}',
			numTexts: 5,
			shareData: 'false'
	}
	
	// fields / elements
	let regexp = $(document.getElementById('regexp'));
	let texts = $(document.getElementById('texts'));
	let regexList = $(document.getElementById('regex_list'));
	let regexDialog = $(document.getElementById('regex_dialog'));
	let shareRegexCheck = $(document.getElementById('share_regex'));
	let lastUsedRegexDt = $('dt', document.getElementById('last_used_regex'));
	let lastUsedRegexDd = $('dd', document.getElementById('last_used_regex'));
	let regexStatsList = $(document.getElementById('regex_stat_list'));
	let regexStatsDialog = $(document.getElementById('regex_stats_dialog'));
	
	let stompClient;
	
	// templates
	let templates = {
			texts: _.template('\
<div class="row">\
	<div class="input-group col-md-12 mb-3">\
		<input type="text" class="form-control" readonly>\
		<div class="input-group-append">\
			<button type="button" class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="Copy"><i class="fas fa-clipboard"></i><span class="sr-only">Copy</span></button>\
		</div>\
	</div>\
</div>'),
			regexListItem: _.template('\
<div class="list-group-item list-group-item-action">\
	<div class="row">\
		<a href="#" class="col-sm-10"><%- regex %></a>\
		<div class="col-sm-2"><button type="button" class="btn btn-outline-danger btn-sm float-right" data-toggle="tooltip" data-placement="top" title="Delete"><i class="fas fa-trash-alt"></i></button></div>\
	</div>\
</div>'),
			lastUsedRegex: _.template('<a href="#" data-regex="<%- regex %>" data-toggle="tooltip" data-placement="top" title="Use this Regex"><%- regex %></a>'),
			regexStatsItem: _.template('<a href="#" class="list-group-item list-group-item-action" data-toggle="tooltip" data-placement="top" data-regex="<%- regex %>"><%- regex %> <span class="badge badge-secondary"><%- used %></span></a>'),
	};
	
	let settings = {
			get lastRegex() {
				return localStorage.getItem('last_regex') || defaults.regex;
			},
			set lastRegex(lastRegex) {
				localStorage.setItem('last_regex', lastRegex);
			},
			get numTexts() {
				return parseInt(localStorage.getItem('num_texts') || defaults.numTexts, 10);
			},
			set numTexts(numTexts) {
				localStorage.setItem('num_texts', numTexts);
			},
			get storedRegex() {
				return JSON.parse(localStorage.getItem('stored_regex') || '{}');
			},
			set storedRegex(storedRegex) {
				localStorage.setItem('stored_regex', JSON.stringify(storedRegex));
			},
			get shareRegex() {
				return (localStorage.getItem('share_regex') || defaults.shareData) === 'true';
			},
			set shareRegex(shareRegex) {
				localStorage.setItem('share_regex', shareRegex);
			}
	}
	
	// functions
	let updateRegex = (ex) => {
		regexp.val(ex);
	}
	
	let initTexts = () => {
		let count = settings.numTexts;
		for (let i = 0; i < count; i++) {
			texts.append(templates.texts());
		}
	}
	
	let generateTexts = (e) => {
		if (e) {
			e.preventDefault();
		}
		regexp.removeClass('is-invalid');
		let regex = regexp.val() || settings.lastRegex;
		try {
			let randExp = new RandExp(regex);
			texts.children().each((i, el) => {
				$('input', el).val(randExp.gen());
			});
			updateRegex(regex);
			settings.lastRegex = regex;
			if (settings.shareRegex) {
				$.post('/lastUsedRegex', { regex: regex });
			}
		} catch (e) {
			regexp.addClass('is-invalid');
		}
	}
	
	let updateRegexList = () => {
		regexList.children().remove();
		let stored = settings.storedRegex;
		$.each(stored, (k) => {
			regexList.append(templates.regexListItem({regex: k}));
		});
	}
	
	let updateLastUsedRegex = (regexStats) => {
		if (regexStats) {
			lastUsedRegexDd.html(templates.lastUsedRegex(regexStats));
			$('span', lastUsedRegexDt).text(regexStats.used);
			$('a', lastUsedRegexDd).tooltip();
			let ago = moment(regexStats.lastUsed).fromNow();
			lastUsedRegexDt.attr({'data-original-title': ago, 'data-last-used': regexStats.lastUsed}).tooltip();
		} else {
			lastUsedRegexDd.html(' <em>none</em>');
			$('span', lastUsedRegexDt).text(0);
		}
	}
	
	// events
	$(document.getElementById('create_new')).on('click', generateTexts);
	
	$(document.getElementById('use_default')).on('click', (e) => {
		e.preventDefault();
		updateRegex(defaults.regex);
	});
	
	$(document.getElementById('reset_regex')).on('click', (e) => {
		e.preventDefault();
		regexp.removeClass('is-invalid');
		updateRegex(settings.lastRegex);
	});
	
	$(texts).on('click', 'button', (e) => {
		e.preventDefault();
		let dummy = document.createElement('input');
		document.body.appendChild(dummy);
		let button = $(e.currentTarget);
		dummy.value = button.parent().siblings('input').val();
		dummy.select();
		document.execCommand('copy');
		document.body.removeChild(dummy);
		$('i', button).removeClass('fa-clipboard').addClass('fa-clipboard-check');
		setTimeout(() => { $('i', button).removeClass('fa-clipboard-check').addClass('fa-clipboard') }, 500);
	});
	
	$(document.getElementById('save_local')).on('click', (e) => {
		e.preventDefault();
		let stored = settings.storedRegex;
		let currentValue = regexp.val();
		if (!currentValue) {
			return;
		}
		stored[currentValue] = (stored[currentValue] || 0) + 1;
		settings.storedRegex = stored;
		updateRegexList();
	});
	
	regexList.on('click', 'a', (e) => {
		e.preventDefault();
		regexp.val($(e.currentTarget).text());
		regexDialog.modal('hide');
	});
	
	regexList.on('click', 'button', (e) => {
		e.preventDefault();
		let regexToDelete = $(e.currentTarget).parent().siblings('a').text();
		let stored = settings.storedRegex;
		delete stored[regexToDelete];
		settings.storedRegex = stored;
		updateRegexList();
	})
	
	$(document.getElementById('add_row')).on('click', (e) => {
		e.preventDefault();
		let row = $(templates.texts());
		texts.append(row);
		$('[data-toggle="tooltip"]', row).tooltip();
		$('input', row).val(new RandExp(settings.lastRegex).gen());
		settings.numTexts = settings.numTexts + 1;
	});
	
	$(document.getElementById('remove_row')).on('click', (e) => {
		e.preventDefault();
		if (settings.numTexts <= 1) {
			return;
		}
		texts.children().last().remove();
		settings.numTexts = settings.numTexts - 1;
	});
	
	shareRegexCheck.on('change', (e) => {
		settings.shareRegex = shareRegexCheck.prop('checked');
	});
	
	lastUsedRegexDd.on('click', 'a', (e) => {
		updateRegex($(e.currentTarget).data('regex'));
	});
	
	let dialogFromNowTimer;
	
	regexStatsDialog.on('show.bs.modal', () => {
		let statItems = [];
		$.get('mostUsedRegex', (data) => {
			regexStatsList.children().remove();
			$.each(data, (i, el) => {
				let statItem = $(templates.regexStatsItem(el));
				statItems.push(statItem);
				regexStatsList.append(statItem);
				statItem.attr({
					'data-original-title': moment(el.lastUsed).fromNow(),
					'data-last-used': el.lastUsed
				}).tooltip();
			});
		});
		
		dialogFromNowTimer = setInterval(() => {
			$.each(statItems, (i, el) => {
				el.attr('data-original-title', moment(el.attr('data-last-used')).fromNow());
			});
		}, 100);
	});
	
	regexStatsDialog.on('hide.bs.modal', () => {
		if (dialogFromNowTimer) {
			clearInterval(dialogFromNowTimer);
		}
	});
	
	regexStatsList.on('click', 'a', (e) => {
			e.preventDefault();
			updateRegex($(e.currentTarget).data('regex'));
			regexStatsDialog.modal('hide');
	});
	
	// timers
	setInterval(() => {
		if (!lastUsedRegexDt.attr('data-last-used')) {
			return;
		}
		let ago = moment(lastUsedRegexDt.attr('data-last-used')).fromNow();
		lastUsedRegexDt.attr('data-original-title', ago).tooltip();
	}, 100);
	
	// initializing
	(function() {
		let socket = new SockJS('/raasWs');
		stompClient = Stomp.over(socket);
		stompClient.debug = null;
		stompClient.connect({}, () => {
			stompClient.subscribe('/topic/lastUsedRegex', (data) => {
				updateLastUsedRegex(JSON.parse(data.body));
			});
		});
	}());
	
	updateRegex(settings.lastRegex);
	initTexts();
	generateTexts();
	updateRegexList();
	shareRegexCheck.prop('checked', settings.shareRegex);
	
	$.get('lastUsedRegex', updateLastUsedRegex);
	
	$('[data-toggle="tooltip"]').tooltip();
	$('[data-toggle="popover"]').popover();
	$('form').on('submit', (e) => {
		e.preventDefault();
		generateTexts();
	});
	
}(jQuery));