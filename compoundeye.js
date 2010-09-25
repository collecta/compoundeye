/*
  Compound eye. Author, jack@collecta.com
*/
var Eye = {
    PROMPT: "Look for?",
    DOMAIN: "guest.collecta.com",
    SERVICE: "search.collecta.com",
    BOSH_URL: "/xmpp-httpbind",

    query: null,
    connection: null,
    connected: false,
    images: {},
    total_blocks: 0,
    index: 0,
    order: [],
    paused: false,

    // selectors
    $search: null,
    $input: null,
    $look: null,
    $everything: null,
    $status: null,
    $theeye: null,

    addPrompt: function () {
        this.$input.css({color: '#ccc'});
        this.$input.val(this.PROMPT);
    },

    delPrompt: function () {
        this.$input.css({color: '#000'});
        this.$input.val('');
    },

    startSearch: function (query) {
        // search for only photos
        this.query = query + ' category:photo';

        this._checkStart();
        this.paused = false;
        this.$search.hide();
        this.$theeye.find('div').each(function () {
            $(this).empty();
        });
        this.$theeye.show();
    },

    _checkStart: function () {
        if (Eye.connected) {
            Eye.connection.collecta.subscribe(Eye.query, {
                api_key: "collectademo",
                success: Eye.onEvent,
                error: Eye.onError
            });
        } else {
            setTimeout(Eye._checkStart, 100);
        }
    },

    stopSearch: function () {
        this.query = null;
    },

    status: function (text) {
        this.$status.text(text);
    },

    connect: function () {
        this.connection = new Strophe.Connection(this.BOSH_URL);
        this.connection.connect(this.DOMAIN, null, function (status) {
            if (status === Strophe.Status.CONNECTED) {
                Eye.connected = true;
                Eye.status('linked to master eye');

                // fix up strophe collecta search service
                Eye.connection.collecta.PUBSUB_SERVICE = Eye.SERVICE;
            } else if (status === Strophe.Status.DISCONNECTED) {
                Eye.connected = false;
                Eye.query = null;
                Eye.connection = null;

                Eye.status('link lost with master eye; reload page to re-establish');
            }
        });
    },

    onEvent: function (stanza) {
        if (stanza.tagName !== 'entry' || Eye.paused) { 
	
            return true;
        }

        var $stanza = $(stanza);
        var $content = $stanza.find('content');
        var $summary = $stanza.find('summary');
        var elem = null;
	var data = "";
        if ($content.length > 0) {
            data = $content.text();
        } else if ($summary.length > 0) {
            data = $summary.text();
        }
        try {
           data = data.replace('(', '');
           data = data.replace(')', '');
           $elem = $(data);
	} catch (err) {
          
          return true;
        } 
        var image = "";
	var link  = "";
        // collecta provided media for abstracts
        
	var $image = $elem.find('img');
        link = $elem.find('img').parent().attr('href');
        image = $image.attr('src') || "";
	if (image == "") 
        {         
               image = $stanza.find("link[rel=collecta-abstract-image]").attr("href");       
               link = image;
        } 
	
        if (image !== "") {
            if (!Eye.images[image]) {
                Eye.displayImage(image, link);
            }
        } 


        return true;
    },

    onError: function () {
        Eye.status('master eye link errored; reload the page to try again');
    },

    setupBoxes: function () {
        this.$theeye.empty();
        var height = $(window).height();
        var width = $(window).width();

        var rows = Math.floor(height / 200);
        var cols = Math.floor(width / 200);

        this.total_blocks = rows * cols;
        var i;
        this.order = [];
        for (i = 0; i < this.total_blocks; i++) {
            this.order.push(i);
        }

        var left_margin = (width % 200) / 2;
        var top_margin = (height % 200) / 2;

        var x, y;
        for (y = 0; y < rows; y++) {
            for (x = 0; x < cols; x++) {
                $('<div></div>')
                    .addClass('block')
                    .css({position: 'absolute',
                          overflow: 'hidden',
                          width: '200px',
                          height: '200px',
                          top: "" + (y * 200 + top_margin) + "px",
                          left: "" + (x * 200 + left_margin) + "px"})
                    .appendTo(Eye.$theeye);
            }
        }
    },

    _randomize: function (list) {
        var new_list = [];
        
        while (list.length > 0) {
            var idx = Math.floor(Math.random() * list.length);
            var removed = list.splice(idx, 1);
            new_list.push(removed[0]);
        }

        return new_list;
    },

    displayImage: function (url, link) {
        if (Eye.paused) { return; }

        Eye.images[url] = true;
	
        // calculate block
        if (Eye.index === 0) {
            Eye.order = Eye._randomize(Eye.order);
        }
            
        var $block = $(Eye.$theeye.find('div')[Eye.order[Eye.index++]]);
        Eye.index %= Eye.total_blocks;

        var $img = $("<img>")
            .css({position: 'relative', top: "200px", left: "0"});
        $img.load(function () {
            if (Eye.paused) {
                return;
            }
            var w = $img.attr('width');
            var h = $img.attr('height');
            
            // scale smallest side up or down and center
            var portrait = w < h;
            if (w < h) {
                $img.attr('width', 200);
                h = Math.floor(($img.attr('height') - 200) / 2);
                $img.css({top: "-" + h + "px", left: "0"});
            } else {
                $img.attr('height', 200);
                w = Math.floor(($img.attr('width') - 200) / 2);
                $img.css({top: "0", left: "-" + w + "px"});
            }

            // nuke old image if any
            var $old = $block.find('img:not(:last):first');
            delete Eye.images[$old.attr('src')];
            $old.remove();
        });
        $img.attr('src', url)
            .data('link', link)
            .appendTo($block);
    },

    pause: function () {
        this.paused = true;

        Eye.$theeye.find('div').each(function () {
            var $old = $(this).find('img:not(:first)');
            $old.each(function () {
                delete Eye.images[$(this).attr('src')];
            });
            $old.remove();
        });
    },

    resume: function () {
        this.paused = false;
    },

    showPhoto: function ($block_img) {
        this.$theeye.hide();
        
        var $img = $("<img>")
            .attr('src', $block_img.attr('src'))
            .click(Eye.hidePhoto)
            .css({margin: "0 auto", display: "block"});
        var $div = $("<div id='zoomed'></div>");
        $div.append($img);
        var link = $block_img.data('link');
        if (link) {
            $div.append("<a href='" + $block_img.data('link') + "' target='_new'>" +
                        "view photo page</a>");
        }
        $div.appendTo('body');
    },
    
    hidePhoto: function () {
        $('#zoomed').remove();
        Eye.$theeye.show();
        Eye.resume();
    }
};

$(document).ready(function () {
    // init selectors
    Eye.$search = $('#search');
    Eye.$input = $('#query');
    Eye.$look = $('#look');
    Eye.$everything = $('#everything');
    Eye.$status = $('#status');
    Eye.$theeye = $('#the-eye');

    // center the search div
    var win_height = $(window).height();
    var div_height = Eye.$input.height();
    Eye.$search.css({marginTop: '' + (win_height / 2) - (div_height / 2) + 'px',
                     visibility: 'visible'});


    Eye.setupBoxes();
    
    // event handlers

    $(window).resize(function(){Eye.setupBoxes()});

    Eye.$input.focus(function () {
        var $this = $(this);
        if ($this.val() === Eye.PROMPT) {
            Eye.delPrompt();
        }
    });

    Eye.$input.blur(function () {
        var $this = $(this);
        if ($this.val() === '') {
            Eye.addPrompt();
        }
    });

    Eye.$input.keypress(function (e) {
        if (e.which === 13) {
            Eye.$look.click();
        }
    });

    Eye.$look.click(function (e) {
        Eye.stopSearch();
        Eye.startSearch(Eye.$input.val());

        Eye.addPrompt();
        Eye.$input.blur();

       e.stopPropagation();
    });
    
    Eye.$everything.click(function (e) {
        Eye.stopSearch();
        Eye.startSearch('');
        
        Eye.addPrompt();
        Eye.$input.blur();

        e.stopPropagation();
    });

    $('#the-eye div.block').click(function () {
        Eye.pause();
        
        Eye.showPhoto($(this).find('img:first'));
    });

    $(window).keypress(function (e) {
        if (e.which === 32) {
            if (Eye.connected) {
                if (Eye.paused) {
                    Eye.resume();
                } else {
                    Eye.pause();
                }
            }
        }
    });
    
    $(window).keydown(function (e) {
        if (e.which === 27) {
            var $photo = $('#zoomed');
            if ($photo.length > 0) {
                Eye.hidePhoto();
            } else if (Eye.connected) {
                Eye.pause();
                Eye.connection.collecta.unsubscribeAll();
                Eye.$theeye.hide();
                Eye.$search.show();
            }
        }
    });

    Eye.connect();
    Eye.stopSearch();

    Eye.startSearch('');
        
  });
