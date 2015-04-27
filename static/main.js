// Generated by CoffeeScript 1.9.0
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  define(['base/js/namespace', 'jquery', 'components/es6-promise/promise.min', 'thebe/dotimeout', 'notebook/js/notebook', 'thebe/jquery-cookie', 'thebe/default_css', 'contents', 'services/config', 'base/js/utils', 'base/js/page', 'base/js/events', 'notebook/js/actions', 'notebook/js/kernelselector', 'services/kernels/kernel', 'codemirror/lib/codemirror', 'custom/custom'], function(IPython, $, promise, doTimeout, notebook, jqueryCookie, default_css, contents, configmod, utils, page, events, actions, kernelselector, kernel, CodeMirror, custom) {
    var Thebe;
    promise.polyfill();
    Thebe = (function() {
      Thebe.prototype.default_options = {
        selector: 'pre[data-executable]',
        url: '//192.168.59.103:8000/spawn/',
        append_kernel_controls_to: 'body',
        inject_css: 'no_hl',
        load_css: true,
        load_mathjax: true,
        debug: false
      };

      function Thebe(_at_options) {
        var thebe_url, _ref;
        this.options = _at_options != null ? _at_options : {};
        this.setup = __bind(this.setup, this);
        this.run_cell = __bind(this.run_cell, this);
        this.start_notebook = __bind(this.start_notebook, this);
        this.start_kernel = __bind(this.start_kernel, this);
        this.before_first_run = __bind(this.before_first_run, this);
        this.set_state = __bind(this.set_state, this);
        this.build_notebook = __bind(this.build_notebook, this);
        this.spawn_handler = __bind(this.spawn_handler, this);
        this.call_spawn = __bind(this.call_spawn, this);
        window.thebe = this;
        this.has_kernel_connected = false;
        this.server_error = false;
        _ref = _.defaults(this.options, this.default_options), this.selector = _ref.selector, this.url = _ref.url, this.debug = _ref.debug;
        if (this.url) {
          this.url = this.url.replace(/\/?$/, '/');
        }
        if (this.url.indexOf('/spawn') !== -1) {
          this.log(this.url + ' is a tmpnb url');
          this.tmpnb_url = this.url;
          this.url = '';
        }
        this.cells = [];
        this.events = events;
        this.setup();
        this.spawn_handler = _.once(this.spawn_handler);
        this.call_spawn = _.once(this.call_spawn);
        thebe_url = $.cookie('thebe_url');
        if (thebe_url && this.url === '') {
          this.check_existing_container(thebe_url);
        }
        if (this.tmpnb_url) {
          this.check_server();
        }
        this.start_notebook();
      }

      Thebe.prototype.call_spawn = function(cb) {
        var invo;
        this.set_state('starting...');
        this.log('call spawn');
        invo = new XMLHttpRequest;
        invo.open('GET', this.tmpnb_url, true);
        invo.onreadystatechange = (function(_this) {
          return function(e) {
            return _this.spawn_handler(e, cb);
          };
        })(this);
        invo.onerror = (function(_this) {
          return function(e) {
            _this.log("Cannot connect to tmpnb server", true);
            _this.set_state('disconnected');
            return $.removeCookie('thebe_url');
          };
        })(this);
        return invo.send();
      };

      Thebe.prototype.check_server = function(invo) {
        if (invo == null) {
          invo = new XMLHttpRequest;
        }
        invo.open('GET', this.tmpnb_url.replace('/spawn', '') + 'user/some_fake_user/api', true);
        invo.onerror = (function(_this) {
          return function(e) {
            _this.log('Checked and cannot connect to tmpnb server!' + e.target.status, true);
            _this.server_error = true;
            return $('.thebe_controls').remove();
          };
        })(this);
        invo.onload = (function(_this) {
          return function(e) {
            return _this.log('Tmpnb server seems to be up');
          };
        })(this);
        return invo.send();
      };

      Thebe.prototype.check_existing_container = function(url, invo) {
        if (invo == null) {
          invo = new XMLHttpRequest;
        }
        invo.open('GET', url + 'api', true);
        invo.onerror = (function(_this) {
          return function(e) {
            $.removeCookie('thebe_url');
            return _this.log('server error when checking existing container');
          };
        })(this);
        invo.onload = (function(_this) {
          return function(e) {
            try {
              JSON.parse(e.target.responseText);
              _this.url = url;
              return _this.log('cookie with notebook server url was right, use as needed');
            } catch (_error) {
              $.removeCookie('thebe_url');
              return _this.log('cookie was wrong/outdated, call spawn as needed');
            }
          };
        })(this);
        return invo.send();
      };

      Thebe.prototype.spawn_handler = function(e, cb) {
        var _ref;
        if ((_ref = e.target.status) === 0 || _ref === 405) {
          this.log('Cannot connect to tmpnb server, status: ' + e.target.status, true);
          return this.set_state('disconnected');
        } else if (e.target.responseURL.indexOf('/spawn') !== -1) {
          this.log('tmpnb server full', true);
          return this.set_state('full');
        } else {
          this.url = e.target.responseURL.replace('/tree', '/');
          this.log('responseUrl is');
          this.log(e.target.responseURL);
          this.start_kernel(cb);
          return $.cookie('thebe_url', this.url);
        }
      };

      Thebe.prototype.build_notebook = function() {
        this.notebook.writable = false;
        this.notebook._unsafe_delete_cell(0);
        $(this.selector).each((function(_this) {
          return function(i, el) {
            var cell, controls;
            cell = _this.notebook.insert_cell_at_bottom('code');
            cell.set_text($(el).text().trim());
            controls = $("<div class='thebe_controls' data-cell-id='" + i + "'></div>");
            controls.html(_this.controls_html());
            $(el).replaceWith(cell.element);
            _this.cells.push(cell);
            if (!_this.server_error) {
              $(cell.element).prepend(controls);
            }
            cell.element.removeAttr('tabindex');
            return cell.element.off('dblclick');
          };
        })(this));
        this.notebook_el.hide();
        this.events.on('kernel_idle.Kernel', (function(_this) {
          return function(e, k) {
            return _this.set_state('idle');
          };
        })(this));
        this.events.on('kernel_busy.Kernel', (function(_this) {
          return function() {
            return _this.set_state('busy');
          };
        })(this));
        return this.events.on('kernel_disconnected.Kernel', (function(_this) {
          return function() {
            return _this.set_state('disconnected');
          };
        })(this));
      };

      Thebe.prototype.set_state = function(_at_state) {
        this.state = _at_state;
        this.log('state :' + this.state);
        return $.doTimeout('thebe_set_state', 500, (function(_this) {
          return function() {
            $(".thebe_controls .state").text(_this.state);
            return false;
          };
        })(this));
      };

      Thebe.prototype.controls_html = function() {
        return "<button data-action='run'>run</button><span class='state'></span>";
      };

      Thebe.prototype.kernel_controls_html = function() {
        return "<button data-action='interrupt'>interrupt kernel</button><button data-action='restart'>restart kernel</button><span class='state'></span>";
      };

      Thebe.prototype.before_first_run = function(cb) {
        var kernel_controls;
        if (this.url) {
          this.start_kernel(cb);
        } else {
          this.call_spawn(cb);
        }
        if (this.options.append_kernel_controls_to) {
          kernel_controls = $("<div class='thebe_controls kernel_controls'></div>");
          return kernel_controls.html(this.kernel_controls_html()).appendTo(this.options.append_kernel_controls_to);
        }
      };

      Thebe.prototype.start_kernel = function(cb) {
        this.set_state('starting...');
        this.log('start_kernel');
        this.kernel = new kernel.Kernel(this.url + 'api/kernels', '', this.notebook, "python2");
        this.kernel.start();
        this.notebook.kernel = this.kernel;
        return this.events.on('kernel_ready.Kernel', (function(_this) {
          return function() {
            var cell, _i, _len, _ref;
            _this.has_kernel_connected = true;
            _this.log('kernel ready');
            _ref = _this.cells;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              cell = _ref[_i];
              cell.set_kernel(_this.kernel);
            }
            return cb();
          };
        })(this));
      };

      Thebe.prototype.start_notebook = function() {
        var common_options, config_section, keyboard_manager, save_widget;
        contents = {
          list_checkpoints: function() {
            return new Promise(function(resolve, reject) {
              return resolve({});
            });
          }
        };
        keyboard_manager = {
          edit_mode: function() {},
          command_mode: function() {},
          register_events: function() {},
          enable: function() {},
          disable: function() {}
        };
        keyboard_manager.edit_shortcuts = {
          handles: function() {}
        };
        save_widget = {
          update_document_title: function() {},
          contents: function() {}
        };
        config_section = {
          data: {
            data: {}
          }
        };
        common_options = {
          ws_url: '',
          base_url: '',
          notebook_path: '',
          notebook_name: ''
        };
        this.notebook_el = $('<div id="notebook"></div>').prependTo('body');
        this.notebook = new notebook.Notebook('div#notebook', $.extend({
          events: this.events,
          keyboard_manager: keyboard_manager,
          save_widget: save_widget,
          contents: contents,
          config: config_section
        }, common_options));
        this.notebook.kernel_selector = {
          set_kernel: function() {}
        };
        this.events.trigger('app_initialized.NotebookApp');
        this.notebook.load_notebook(common_options.notebook_path);
        return this.build_notebook();
      };

      Thebe.prototype.get_button_by_cell_id = function(id) {
        return $(".thebe_controls[data-cell-id=" + id + "] button[data-action='run']");
      };

      Thebe.prototype.run_cell = function(cell_id, end_id) {
        var button, cell, _i, _len, _ref, _results;
        if (end_id == null) {
          end_id = false;
        }
        cell = this.cells[cell_id];
        button = this.get_button_by_cell_id(cell_id);
        if (!this.has_kernel_connected) {
          return this.before_first_run((function(_this) {
            return function() {
              var _i, _len, _ref, _results;
              button.text('running').addClass('running');
              cell.execute();
              if (end_id) {
                _ref = _this.cells.slice(cell_id + 1, +end_id + 1 || 9e9);
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  cell = _ref[_i];
                  _results.push(cell.execute());
                }
                return _results;
              }
            };
          })(this));
        } else {
          button.text('running').addClass('running');
          cell.execute();
          if (end_id) {
            _ref = this.cells.slice(cell_id + 1, +end_id + 1 || 9e9);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              cell = _ref[_i];
              _results.push(cell.execute());
            }
            return _results;
          }
        }
      };

      Thebe.prototype.setup = function() {
        var script, urls;
        $('body').on('click', 'div.thebe_controls button', (function(_this) {
          return function(e) {
            var action, button, id;
            button = $(e.target);
            id = button.parent().data('cell-id');
            action = button.data('action');
            if (e.shiftKey) {
              action = 'shift-' + action;
            }
            switch (action) {
              case 'run':
                return _this.run_cell(id);
              case 'shift-run':
                _this.log('exec from top to cell #' + id);
                return _this.run_cell(0, id);
              case 'interrupt':
                return _this.kernel.interrupt();
              case 'restart':
                if (confirm('Are you sure you want to restart the kernel? Your work will be lost.')) {
                  return _this.kernel.restart();
                }
            }
          };
        })(this));
        this.events.on('execute.CodeCell', (function(_this) {
          return function(e, cell) {
            var button, id;
            id = $('.cell').index(cell.cell.element);
            _this.log('exec done for codecell ' + id);
            button = _this.get_button_by_cell_id(id);
            return button.text('done').removeClass('running').addClass('ran');
          };
        })(this));
        window.mathjax_url = '';
        if (this.options.load_mathjax) {
          script = document.createElement("script");
          script.type = "text/javascript";
          script.src = "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
          document.getElementsByTagName("head")[0].appendChild(script);
        }
        if (this.options.inject_css === 'no_hl') {
          $("<style>" + default_css.no_hl + "</style>").appendTo('head');
        } else if (this.options.inject_css) {
          $("<style>" + default_css.css + "</style>").appendTo('head');
        }
        if (this.options.load_css) {
          urls = ["https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.css"];
          return $.when($.each(urls, function(i, url) {
            return $.get(url, function() {
              return $('<link>', {
                rel: 'stylesheet',
                type: 'text/css',
                'href': url
              }).appendTo('head');
            });
          })).then((function(_this) {
            return function() {};
          })(this));
        }
      };

      Thebe.prototype.log = function(m, serious) {
        if (serious == null) {
          serious = false;
        }
        if (this.debug) {
          console.log("%c" + m, "color: blue; font-size: 12px");
        }
        if (serious) {
          return console.log(m);
        }
      };

      return Thebe;

    })();
    window.Thebe = Thebe;
    $(function() {
      var thebe;
      if ($('body').data('runnable')) {
        return thebe = new Thebe();
      }
    });
    return {
      Thebe: Thebe
    };
  });

}).call(this);

//# sourceMappingURL=main.js.map
