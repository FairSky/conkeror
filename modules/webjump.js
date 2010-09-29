/**
 * (C) Copyright 2004-2007 Shawn Betts
 * (C) Copyright 2007-2008 John J. Foerch
 * (C) Copyright 2007-2008 Jeremy Maitin-Shepard
 *
 * Use, modification, and distribution are subject to the terms specified in the
 * COPYING file.
**/

in_module(null);

var webjumps = {};

define_keywords("$completer", "$description", "$argument", "$alternative");
function define_webjump (key, handler) {
    keywords(arguments);
    var argument = arguments.$argument;
    let alternative = arguments.$alternative;

    // handler may be a function or a string.  An alternative url may
    // be passed using the $alternative keyword; it is used in place
    // of the handler when no arguments are supplied by the user when
    // invoking the webjump (see get_webjump).  For string webjumps
    // that contain %s and for which no alternative is provided, an
    // alternative is autogenerated by trimming the path from the url.
    // A webjump can thus function both as a way to invoke a search
    // and as a bookmark.
    //
    // The argument property may be false (no arguments will be
    // accepted for the webjump), true (arguments are required for the
    // webjump) or 'optional' (arguments are accepted but not
    // required).  If the property is not specified, a sensible default
    // is chosen depending on the type of the handler and whether an
    // alternative is specified.  If the property is false, then
    // completing on the name of the webjump in the minibuffer will
    // not result in a space being appended.
    //
    if (typeof(handler) == "function") {
        if (argument == null && alternative == null)
            argument = true;
    } else if (typeof(handler) == "string") {
        if (handler.indexOf('%s') == -1)
            argument = false;
        else if (alternative == null)
            alternative = url_path_trim(handler);
    }
    if (alternative && argument == null)
        argument = 'optional';

    function make_handler (template) {
        var b = template.indexOf('%s');
        return function (arg) {
            var a = b + 2;
            // Just return the same string if it doesn't contain a %s
            if (b == -1)
                return template;
            return template.substr(0,b) + encodeURIComponent(arg) + template.substring(a);
        };
    }

    if (typeof(handler) == "string")
        handler = make_handler(handler);

    webjumps[key] = { key: key,
                      handler: handler,
                      completer: arguments.$completer,
                      description: arguments.$description,
                      argument: argument,
                      alternative: alternative};
}

function define_delicious_webjumps (username) {
    define_webjump("delicious", "http://www.delicious.com/" + username + "/%s",
                   $alternative = "http://www.delicious.com/" + username);
    define_webjump("adelicious", "javascript:location.href='http://www.delicious.com/"+username+
                   "?v=2&url='+encodeURIComponent(location.href)+'&title='+"+
                   "encodeURIComponent(document.title);");
    define_webjump("sdelicious", "http://www.delicious.com/search?p=%s&u="+username+
                   "&chk=&context=userposts&fr=del_icio_us&lc=1");
    define_webjump("sadelicious", "http://www.delicious.com/search/all?search=%s");
}

add_delicious_webjumps = define_delicious_webjumps;

function define_lastfm_webjumps (username) {
    if (! username) username = "";
    define_webjump("lastfm", "http://www.last.fm/user/"+username);
    define_webjump("lastfm-user", "http://www.last.fm/user/%s");
    define_webjump("lastfm-music", "http://www.last.fm/search?m=all&q=%s");
    define_webjump("lastfm-group", "http://www.last.fm/users/groups?s_bio=%s");
    define_webjump("lastfm-tag", "http://www.last.fm/search?m=tag&q=%s");
    define_webjump("lastfm-label", "http://www.last.fm/search?m=label&q=%s");
    define_webjump("lastfm-event", "http://www.last.fm/events?by=artists&q=%s");
}

add_lastfm_webjumps = define_lastfm_webjumps;

function clear_webjumps () {
    webjumps = {};
}

// Some built in web jumps
function define_default_webjumps () {
    define_webjump("conkerorwiki",
                   "http://conkeror.org/?action=fullsearch&context=60&value=%s&fullsearch=Text");
    define_webjump("lucky",      "http://www.google.com/search?q=%s&btnI=I'm Feeling Lucky");
    define_webjump("maps",       "http://maps.google.com/?q=%s");
    define_webjump("scholar",    "http://scholar.google.com/scholar?q=%s");
    define_webjump("clusty",     "http://www.clusty.com/search?query=%s");
    define_webjump("slang",      "http://www.urbandictionary.com/define.php?term=%s");
    define_webjump("dictionary", "http://dictionary.reference.com/search?q=%s");
    define_webjump("image",      "http://images.google.com/images?q=%s");
    define_webjump("clhs",
                   "http://www.xach.com/clhs?q=%s",
                   $alternative = "http://www.lispworks.com/documentation/HyperSpec/Front/index.htm");
    define_webjump("cliki",      "http://www.cliki.net/admin/search?words=%s");
    define_webjump("ratpoisonwiki", "http://ratpoison.antidesktop.net/?search=%s");
    define_webjump("stumpwmwiki", "http://stumpwm.antidesktop.net/wiki?search=%s");
    define_webjump("savannah",
                   "http://savannah.gnu.org/search/?words=%s&type_of_search=soft&Search=Search&exact=1");
    define_webjump("sourceforge", "http://sourceforge.net/search/?words=%s");
    define_webjump("freshmeat", "http://freshmeat.net/search/?q=%s");
    define_webjump("slashdot", "http://slashdot.org/search.pl?query=%s");
    define_webjump("kuro5hin", "http://www.kuro5hin.org/?op=search&string=%s");
}

define_variable("webjump_partial_match", true,
                "When entering a url, if the input is not a webjump, " +
                "but would uniquely complete to a webjump, then accept " +
                "that webjump only if this is true.");

function match_webjump (str) {
    var sp = str.indexOf(' ');

    var key, arg;
    if (sp == -1) {
        key = str;
        arg = null;
    } else {
        key = str.substring(0, sp);
        arg = str.substring(sp + 1);
        if (/^\s*$/.test(arg))
            arg = null;
    }

    // Look for an exact match
    var match = webjumps[key];

    // Look for a partial match
    if (!match && webjump_partial_match) {
        for (let [k,v] in Iterator(webjumps)) {
            if (k.substring(0, key.length) == key) {
                if (match) {
                    // key is not a unique prefix, as there are multiple partial matches
                    return null;
                }
                match = v;
            }
        }
    }

    if (match) {
        if (arg == null && match.argument == true)
            throw interactive_error('Webjump '+key+' requires an argument.');
        return [match, key, arg];
    }
    return null;
}


function get_webjump (value) {
    var res = match_webjump(value);
    if (!res)
        return null;
    let [match,key,arg] = res;
    if (arg == null && match.alternative)
        return match.alternative;
    return match.handler(arg);
}

function get_url_or_webjump (input) {
    var url = get_webjump(input);
    if (url != null)
        return url;
    else
        return input;
}

define_default_webjumps();

function webjump_completer () {
    let base_completer = prefix_completer(
        $completions = [ v for ([k,v] in Iterator(webjumps)) ],
        $get_string = function (x) { return x.key + (x.argument ? " " : ""); },
        $get_description = function (x) { return x.description || ""; });
    return function (input, pos, conservative) {
        let str = input.substring(0,pos);
        let res;
        try { res = match_webjump(str); }
        catch (e) { res = null; }
        if (res) {
            let [match, key, arg] = res;
            if (arg != null) { // If there is no argument yet, we use the base completer
                if (match.completer) {
                    let c = yield match.completer.call(null, arg, pos - key.length - 1, conservative);
                    yield co_return(nest_completions(c, match.key + " "));
                }
                yield co_return(null);
            }
        }
        yield co_return(base_completer(input, pos, conservative));
    };
}

provide("webjump");
