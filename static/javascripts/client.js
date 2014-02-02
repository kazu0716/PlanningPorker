var latest_login_list = [];
var login_name = '';
var suggest_obj = undefined;
var LOGIN_COLOR_MAX = 9;
var COOKIE_NAME = "dev_hub_name";
var COOKIE_AVATAR = "planning_porker_avatar_url";
var COOKIE_CSS_NAME = "dev_hub_css_name";
var COOKIE_EXPIRES = 365;
var CSS_DEFAULT_NAME = "bootstrap.min.css";
var TITLE_ORG = document.title;
var CODE_MIN_HEIGHT = 100;
var CODE_OUT_ADJUST_HEIGHT = 200;
var CODE_INDEX_ADJUST_HEIGHT = 50;
var CODE_ADJUST_HEIGHT = 100;
var SHARE_MEMO_NUMBER = 15;

// for share memo
var writing_text = [];
var text_logs = [];

$(function() {
  init_chat();
  init_number();
  init_sharememo();
  init_websocket();

  var css_name = $.cookie(COOKIE_CSS_NAME) || CSS_DEFAULT_NAME;

  if ( $.cookie(COOKIE_NAME) == null ){
    /*
    setTimeout(function(){
      $('#name_in').modal("show");
      setTimeout(function(){
          $('#login_name').focus();
        },500);
      },500);
    */
  }else{
    login_name = $.cookie(COOKIE_NAME);
    $('#name').val(login_name);
    var avatar = $.cookie(COOKIE_AVATAR) || "";
    $('#avatar_url').val(avatar);
  }
});

function init_chat(){
  $('#list').on('click', '.remove_msg', function(){
    var id = "#" + $(this).closest('li').attr('id');
    var data_id = $(this).closest('li').data('id');
    $(id).fadeOut();
    send_remove_msg(data_id);
  });
  $('#list').on('click', '.login-name-base', function(){
    var name = $(this).text();
    $('#message').val($('#message').val() + " @" + name + "さん ");
    $('#message').focus();
  });
}

function init_number(){
  var socket = io.connect('/');
  $('.number-list').on('click', 'button', function(){
    console.log($(this).html());

    var name = $('#name').val();
    socket.emit('number', {name:name, number:$(this).html()});
  });

  $('.action-list').on('click', '.clear-btn', function(){
    socket.emit('number', {name:name, number:""});
  });

  $('.action-list').on('click', '.all-clear-btn', function(){
    socket.emit('number-all-clear');
  });
}

function init_sharememo(){
  var i = 1;
  $("#share-memo").after($('<div/>').attr('id',"share_memo_" + i).attr("data-no",i).addClass("share-memo tab-pane"));
  $("#memo_number_option_top").after($('<option/>').attr('value',i).html(i));

  $(".share-memo").each(function(){
    $(this).append(
      $('<textarea/>').addClass("code code-unselect").css("display","none").attr("placeholder", "Write here")).append(
      $('<pre/>').addClass("text-base-style").append($('<div/>').addClass("code-out")));
  });
}

function init_websocket(){
  var socket = io.connect('/');
  socket.on('connect', function() {
    //console.log('connect');
    socket.emit('name', {name: $.cookie(COOKIE_NAME)});
    socket.emit('avatar', {url: $.cookie(COOKIE_AVATAR)});
  });

  socket.on('disconnect', function(){
    //console.log('disconnect');
  });

  // for chat
  socket.on('message_own', function(data) {
    prepend_own_msg(data);
  });

  socket.on('message', function(data) {
    prepend_msg(data);
  });

  socket.on('remove_message', function(data) {
    $('#msg_' + data.id).fadeOut();
  });

  socket.on('list', function(login_list) {
    $('#login_list_loader').hide();

    var is_all_number = true;
    for (var i = 0; i < login_list.length; ++i){
      if (login_list[i].number == undefined || login_list[i].number == ""){
        is_all_number = false;
        break;
      }
    }
 
    var out_list = "";
    var hide_sym = '<span class="glyphicon glyphicon-ok-circle"></span>';
    var is_all_same = true;
    var prev_number = login_list[0].number;
    for (var i = 0; i < login_list.length; ++i){
      var number = "&nbsp;";
      if (login_list[i].avatar){
        number = '<img src="' + login_list[i].avatar + '" width="65px" class="img-rounded">';
      }

      if (login_list[i].number != undefined && login_list[i].number != ""){
        if (is_all_number){
          number = login_list[i].number;
          if (prev_number != number){ is_all_same = false }
          prev_number = number;
        }else{
          number = hide_sym;
        }
      }
      var login_elem = '<li><div class="login-elem login-name' + get_color_id_by_name_id(login_list[i].id) + '"><div class="name">' + login_list[i].name + '</div><div class="number">' + number + '</div></div></li>';
      out_list += login_elem;
    }
    out_list = '<div class="list"><ul>' + out_list + "</ul></div>";

    if ($('#login_list').html() != out_list){
      $('#login_list').html(out_list);
      $('#login_list').fadeIn();
    }

    if (login_list.length > 1 && is_all_number && is_all_same){
      $('.login-elem').each(function(){
        $(this).addClass("text-highlight");
        $(this).switchClass("text-highlight", "", 5000);
      });
    }

    latest_login_list = login_list.sort(function(a,b){ return b.name.length - a.name.length });
    document.title = "(" + login_list.length + ") " + TITLE_ORG;
  });

  socket.on('latest_log', function(msgs) {
    for ( var i = 0 ; i < msgs.length; i++){
      append_msg(msgs[i])
    }
  });

  $('#name_form').submit(function() {
    var name = $('#name').val();
    $.cookie(COOKIE_NAME,name,{ expires: COOKIE_EXPIRES });

    if ( name ){
      login_name = name;
      socket.emit('message', {name:name, msg:""});
    }
    return false;
  });

  $('#avatar_form').submit(function() {
    var avatar = $('#avatar_url').val();
    $.cookie(COOKIE_AVATAR, avatar ,{ expires: COOKIE_EXPIRES });

    socket.emit('avatar', {url:avatar});
    return false;
  });

  $(".code").autofit({min_height: CODE_MIN_HEIGHT});

  function setCaretPos(item, pos) {
    if (item.setSelectionRange) {  // Firefox, Chrome
      item.setSelectionRange(pos, pos);
    } else if (item.createTextRange) { // IE
      var range = item.createTextRange();
      range.collapse(true);
      range.moveEnd("character", pos);
      range.moveStart("character", pos);
      range.select();
    }
  };

  function switchEditShareMemo($share_memo, row){
    var no = $share_memo.data('no');
    writing_text[no] = writing_text[no] ? writing_text[no] : { text: "" };

    var $target_code = $share_memo.children(".code");
    $target_code.val(writing_text[no].text);
    $target_code.fadeIn('fast', function(){
      $target_code.keyup(); //call autofit
      // 編集モード時に選択した行位置を表示する
      $target_code.caretLine(row);
      $('#memo_area').scrollTop(row * 18 - CODE_ADJUST_HEIGHT);
    });
    $share_memo.children('pre').hide();
    $share_memo.children('.fix-text').show();
    $share_memo.children('.sync-text').hide();
    writing_loop_start(no);
 
    code_prev[no] = $target_code.val();
  }

  $('.share-memo').on('click','.sync-text', function(){
    var $share_memo = $(this).closest('.share-memo');
    switchEditShareMemo($share_memo, 0);
  });

  $('.share-memo').on('dblclick','pre tr', function(){
    // クリック時の行数を取得してキャレットに設定する
    var $share_memo = $(this).closest('.share-memo');
    var row = $(this).closest("table").find("tr").index(this);
    switchEditShareMemo($share_memo, row);
    return false;
  });

  $('.share-memo').on('dblclick','pre', function(){
    // 文字列が無い場合は最下部にキャレットを設定する
    var $share_memo = $(this).closest('.share-memo');
    var row = $(this).find("table tr").length - 1;
    switchEditShareMemo($share_memo, row);
  });

  // デコレートされた html へのイベント登録
  $('.share-memo').decora({
    checkbox_callback: function(that, applyCheckStatus){
      var share_memo_no = $(that).closest('.share-memo').data('no');

      // チェック対象のテキストを更新する
      writing_text[share_memo_no].text = applyCheckStatus(writing_text[share_memo_no].text);

      // 変更をサーバへ通知
      var $target_code = $(that).closest('.share-memo').children('.code');
      $target_code.val(writing_text[share_memo_no].text);
      socket.emit('text',{no: share_memo_no, text: $target_code.val()});
    }
  });

  function switchFixShareMemo($share_memo, row){
    if ($share_memo.children('.code').css('display') == "none"){ return; }

    $share_memo.children('.code').hide();
    $share_memo.children('pre').fadeIn();
    $share_memo.children('.fix-text').hide();
    $share_memo.children('.sync-text').show();

    // 閲覧モード時に編集していたキャレット位置を表示する
    var $target_tr = $share_memo.find('table tr').eq(row - 1);
    if ($target_tr.length > 0){
      $('#memo_area').scrollTop(0);
      $('#memo_area').scrollTop($target_tr.offset().top - CODE_OUT_ADJUST_HEIGHT);
    }
    socket.emit('add_history',{no: $share_memo.data('no')});
    writing_loop_stop();
  }

  $('.share-memo').on('dblclick','.code', function(){
    switchFixShareMemo($(this).parent(), $(this).caretLine());
  });

  $('.share-memo').on('click','.fix-text', function(){
    switchFixShareMemo($(this).parent(),1);
  });

  $(".share-memo").on('keydown','.code',function(event){
    // Ctrl - S or Ctrl - enter
    if ((event.ctrlKey == true && event.keyCode == 83) ||
        (event.ctrlKey == true && event.keyCode == 13)) {
      event.returnvalue = false;
      switchFixShareMemo($(this).parent(), $(this).caretLine());
      return false;
    }
  });

  var update_timer = [];
  // for share memo
  socket.on('text', function(text_log) {
    var no = text_log.no == undefined ? 1 : text_log.no;
    writing_text[no] = text_log;
    var $target = $('#share_memo_' + no);
    var $target_tab = $('#share_memo_tab_' + no);

    // 編集中の共有メモに他ユーザの変更が来たらフォーカスを外す
    if ( no == writing_loop_timer.code_no && login_name != text_log.name ){
      switchFixShareMemo($target, $target.children('.code').caretLine());
    }

    function setToTable(html){
      var table_html = "<table><tr><td>";
      table_html += html.replace(/[\n]/g,"</td></tr><tr><td>");
      return table_html += "</td></tr></table>";
    }

    // for code_out
    if (text_log.text != ""){
      $target.find('.code-out').html(setToTable($.decora.to_html(text_log.text)));
    }else{
      $target.find('.code-out').html(setToTable($.decora.to_html("Please double click and then write here.")));
    }

    // チェックボックスの進捗表示
    var checked_count = $target.find("input:checked").length;
    var checkbox_count = $target.find("input[type=checkbox]").length;
    if (checkbox_count > 0){
      $target.find('.checkbox-count').html(checked_count + "/" + checkbox_count + " done").show();
      if (checked_count == checkbox_count){
        $target.find('.checkbox-count').addClass('checkbox-count-done');
      }else{
        $target.find('.checkbox-count').removeClass('checkbox-count-done');
      }
    }else{
      $target.find('.checkbox-count').hide();
    }

    var title = $target.find('.code-out').text().split("\n")[0].substr(0,4);
    $target_tab.children('span').html(title);

    var $writer = $target_tab.children('.writer');
    $writer.addClass("silent-name writing-name");
    $writer.html(text_log.name);

    var $timestamp = $target_tab.find('.timestamp');
    $timestamp.attr("data-livestamp", text_log.date);

    var is_blank = text_log.text == "";
    if (is_blank){
      $writer.hide();
      $timestamp.hide();
    }else{
      $writer.show();
      $timestamp.show();
    }

    if (update_timer[no]){
      clearTimeout(update_timer[no]);
    }
    update_timer[no] = setTimeout(function(){
      $writer.removeClass("writing-name");
      update_timer[no] = undefined;
    },3000);
  });

  socket.on('text_logs_with_no', function(data){
    text_logs[data.no] = data.logs;
  });

  socket.on('text_logs', function(text_logs){
    var logs_dl = $("<dl/>")
    for ( var i = 0; i < text_logs.length; ++i){
      var no = text_logs[i].no == undefined ? 1 : text_logs[i].no; // マルチメモ対応前の救済処置。

      var text_log_id = "text_log_id_" + text_logs[i]._id.toString();
      var text_body = $.decora.to_html(text_logs[i].text);

      var log_div = $("<div/>").attr("id", text_log_id);
      var log_dt = $("<dt/>");
      var writer_label = $("<span/>").addClass("label").text( text_logs[i].name + " at " + text_logs[i].date );
      var icon = $("<i/>").addClass("icon-repeat");
  
      var restore_btn = $("<div/>").addClass("btn-group").append(
                           $("<a/>").addClass("restore-log-button btn btn-mini dropdown-toggle")
                                    .attr("data-toggle","dropdown")
                                    .attr("data-no",i)
                                    .html('<i class="icon-share-alt"></i> Restore to ').append(
                             $("<span/>").addClass("caret"))).append(
                           $("<ul/>").addClass("dropdown-menu"));

      var favo_star = undefined;
      if ( text_logs[i].favo ){
        favo_star = $('<span/>').text('★').addClass("favo_star").toggle(
          function(){
            var target_log_id = text_logs[i]._id.toString();
            return function(){
              $(this).removeClass("favo_star")
                     .addClass("no_favo_star")
                     .text("☆")
              socket.emit('remove_favo_text', target_log_id);
            }
          }(),
          function(){
            var target_log_id = text_logs[i]._id.toString();
            return function(){
              $(this).removeClass("no_favo_star")
                     .addClass("favo_star")
                     .text("★")
              socket.emit('add_favo_text', target_log_id);
            }
          }()
        )
      }else{
        favo_star = $('<span/>').text('☆').addClass("no_favo_star").toggle(
          function(){
            var target_log_id = text_logs[i]._id.toString();
            return function(){
              $(this).removeClass("no_favo_star")
                     .addClass("favo_star")
                     .text("★")
              socket.emit('add_favo_text', target_log_id);
            }
          }(),
          function(){
            var target_log_id = text_logs[i]._id.toString();
            return function(){
              $(this).removeClass("favo_star")
                     .addClass("no_favo_star")
                     .text("☆")
              socket.emit('remove_favo_text', target_log_id);
            }
          }()
        )
      }

      var remove_btn = $('<a href="#" class="remove_text">x</a>').click(function(){
        var target_dom_id = text_log_id
        var target_log_id = text_logs[i]._id.toString();
        return function(){
          $('#' + target_dom_id).fadeOut("normal",function(){
            socket.emit('remove_text', target_log_id);
          });
          return false;
        }
      }())

      var log_dd = $("<dd/>")
      var log_pre = $("<pre/>").html(text_body)

      log_dt.append(
        $("<table/>").append(
          $("<tr/>").append(
            $("<td/>").append(
              favo_star)).append(
            $("<td/>").append(
              writer_label)).append(
            $("<td/>").append(
              restore_btn)))).append(
        remove_btn);
      log_dd.append(log_pre)
      log_div.append(log_dt).append(log_dd)
      logs_dl.append(log_div)
    }
    $('#auto_logs').empty();
    $('#auto_logs').append(logs_dl);

    $('.restore-log-button').click(function(){
      var $restore_target_list = $(this).parent().children('ul');
      var log_no = $(this).data('no');
      var restore_text = text_logs[log_no].text;
      $restore_target_list.empty();
      setRestoreToLists($restore_target_list, log_no, restore_text);
    });
  });

  socket.on('favo_logs', function(favo_logs){
    var logs_dl = $("<dl/>")
    for ( var i = 0; i < favo_logs.length; ++i){
      var no = favo_logs[i].no == undefined ? 1 : favo_logs[i].no;
      var text_log_id = "favo_log_id_" + favo_logs[i]._id.toString();
      var text_body = $.decora.to_html(favo_logs[i].text);

      var log_div = $("<div/>").attr("id", text_log_id)
      var log_dt = $("<dt/>")
      var writer_label = $("<span/>").addClass("label").addClass("label-warning").text( favo_logs[i].name + " at " + favo_logs[i].date )
      var icon = $("<i/>").addClass("icon-repeat")

      var restore_btn = $("<div/>").addClass("btn-group").append(
                           $("<a/>").addClass("restore-favo-button btn btn-mini dropdown-toggle")
                                    .attr("data-toggle","dropdown")
                                    .attr("data-no",i)
                                    .html('<i class="icon-share-alt"></i> Restore to ').append(
                             $("<span/>").addClass("caret"))).append(
                           $("<ul/>").addClass("dropdown-menu"));

      var remove_btn = $('<a href="#" class="remove_text">x</a>').click(function(){
        var target_dom_id = text_log_id
        var target_log_id = favo_logs[i]._id.toString();
        return function(){
          $('#' + target_dom_id).fadeOut("normal",function(){
            socket.emit('remove_favo_text', target_log_id);
          });
          return false;
        }
      }())

      var log_dd = $("<dd/>")
      var log_pre = $("<pre/>").html(text_body)

      log_dt.append(
        $("<table/>").append(
          $("<tr/>").append(
            $("<td/>").append(
              writer_label)).append(
            $("<td/>").append(
              restore_btn)))).append(
        remove_btn);

      log_dd.append(log_pre)
      log_div.append(log_dt).append(log_dd)
      logs_dl.append(log_div)
    }

    $('#favo_logs').empty();
    $('#favo_logs').append(logs_dl);

    $('.restore-favo-button').click(function(){
      var $restore_target_list = $(this).parent().children('ul');
      var log_no = $(this).data('no');
      var restore_text = favo_logs[log_no].text;

      $restore_target_list.empty();
      setRestoreToLists($restore_target_list, log_no, restore_text);
    });
  });

  function setRestoreToLists($restore_target_list, log_no, restore_text){
    $(".share-memo-tab:visible").each(function(){
      var restore_target_no = $(this).data('no');
      $restore_target_list.append(
        $("<li/>").append(
          $("<a/>").html(restore_target_no).click(function(){
            return function(){
              $('#share_memo_' + restore_target_no).children('.code').val(restore_text);
              $('#share_memo_tab_' + restore_target_no).click();
              $('html,body').animate({ scrollTop: 0 }, 'slow');

              socket.emit('text',{no: restore_target_no, text: $('#share_memo_' + restore_target_no).children('.code').val()});
            }();
          })
        )
      );
    });
  }

  var code_prev = [];

  var writing_loop_timer = { id: -1, code_no: 0};
  function writing_loop_start(no){
    $target_code = $('#share_memo_' + no).children('.code');
    var loop = function() {
      var code = $target_code.val();
      if (code_prev[no] != code) {
        socket.emit('text',{no: no, text: code});
        code_prev[no] = code;
      }
    };
    // 念のためタイマー止めとく
    if (writing_loop_timer.id != -1){
      writing_loop_stop();
    }
    writing_loop_timer = {id: setInterval(loop, 400), code_no: no};
  }

  function writing_loop_stop(){
    clearInterval(writing_loop_timer.id);
    writing_loop_timer = { id: -1, code_no: 0};
  }

  $('#memo_number').bind('change',function(){
    var num = $(this).val();
    socket.emit('memo_number', {num: num});
  });

  socket.on('memo_number', function(data){
    var num = data.num;
    $('.share-memo-tab-elem').hide();
    for (var i = 1; i <= num; i++){
      $('#share_memo_tab_' + i).fadeIn("fast");
      $('#share_memo_tab_' + i).css("display", "block");
    }
    $('#memo_number').val(num);
  });
};

function suggest_start(list){
  var suggest_list = []
  for (var i = 0; i < list.length; ++i){
    suggest_list.push("@" + list[i].name + "さん");
  }

  if (suggest_obj == undefined){
    suggest_obj = new Suggest.LocalMulti("message", "suggest", suggest_list, {interval: 200, dispAllKey: false, prefix: true, highlight: true});
  }else{
    suggest_obj.candidateList = suggest_list;
  }
}

function append_msg(data){
  //TODO: System メッセージを非表示にする。
  //      切り替え可能にするかは検討する。
  if (data.name == "System") { return };
  if (exist_msg(data)){ return };

  var msg = get_msg_html(data);

  $('#list').append(msg.li.addClass(msg.css));
  msg.li.fadeIn();
};

function prepend_own_msg(data){
  if (exist_msg(data)){ return };
  var msg = get_msg_html(data);

  $('#list').prepend(msg.li);
  msg.li.addClass("text-highlight",0);
  msg.li.slideDown('fast',function(){
    msg.li.switchClass("text-highlight", msg.css, 500);
  });
};

function send_remove_msg(id){
  var socket = io.connect('/');

  socket.emit('remove_message', {id:id});
}

function prepend_msg(data){
  //TODO: System メッセージを非表示にする。
  //      切り替え可能にするかは検討する。
  if (data.name == "System") { return }
  if (exist_msg(data)){ return };

  var msg = get_msg_html(data);

  $('#list').prepend(msg.li);
  msg.li.addClass("text-highlight",0);
  msg.li.slideDown('fast',function(){
    msg.li.switchClass("text-highlight", msg.css, 500);
  });
};

function exist_msg(data){
  if (data.msg == undefined) { data.msg = ""; }
  var id = '#msg_' + data._id.toString();
  return $(id).size() > 0;
}

function get_msg_html(data){
  if ( data.name == login_name ){
    return {
      li: get_msg_li_html(data).html(get_msg_body(data) + '<a class="remove_msg">x</a><span class="own_msg_date">' + data.date + '</span></td></tr></table>'),
      css: "own_msg"
    };
  } else if (include_target_name(data.msg,login_name)){
    return {
      li: get_msg_li_html(data).html(get_msg_body(data) + ' <span class="target_msg_date">' + data.date + '</span></td></tr></table>'),
      css: "target_msg"
    };
  }else{
    return {
      li: get_msg_li_html(data).html(get_msg_body(data) + ' <span class="date">' + data.date + '</span></td></tr></table>'),
      css: null
    };
  }
}

function get_msg_li_html(data){
  if ( data._id != undefined ){
    return $('<li/>').attr('style','display:none').attr('id','msg_' + data._id.toString()).attr('data-id', data._id.toString());
  }else{
    return $('<li/>').attr('style','display:none');
  }
}

function get_msg_body(data){
  var date = new Date();
  var id = date.getTime();

  var name_class = "login-name";
  var msg_class = "msg";

  data.id = get_id(data.name)

  if ( data.name == "System" ){
    name_class = "login-name-system";
    msg_class = "msg_ext"
  }else if ( data.ext == true ){
    name_class = "login-name-ext";
    msg_class = "msg_ext"
  }else if ( data.name == "Pomo" ){
    name_class = "login-name-pomosys";
    msg_class = "msg_pomo"
  }else{
    name_class = "login-name" + get_color_id_by_name_id(data.id);
  }

  return '<table><tr><td nowrap valign="top"><span class="login-name-base ' + name_class + '">' + data.name + '</span></td><td width="100%"><span class="msg_text ' + msg_class + '">' + decorate_msg(data.msg) + '</span>';
}

function get_color_id_by_name_id(id){
  if(id == 0){ return 0; } // no exist user.
  return id % LOGIN_COLOR_MAX + 1; // return 1 〜 LOGIN_COLOR_MAX
}

function decorate_msg(msg){
  var deco_msg = msg;

  deco_msg = deco_login_name(deco_msg)
  deco_msg = deco_msg.replace(/((https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+))/g,function(){ return '<a href="' + arguments[1] + '" target="_blank" >' + arguments[1] + '</a>' });
  deco_msg = deco_msg.replace(/(SUCCESS|OK|YES)/, function(){ return ' <span class="label label-success">' + arguments[1] + '</span> '});
  deco_msg = deco_msg.replace(/(FAILURE|NG|NO)/, function(){ return ' <span class="label label-important">' + arguments[1] + '</span> '});
  deco_msg = deco_msg.replace(/[\(（](笑|爆|喜|嬉|楽|驚|泣|涙|悲|怒|厳|辛|苦|閃|汗|忙|急|輝)[\)）]/g, function(){ return '<span class="emo">' + arguments[1] + '</span>'});

  return deco_msg;
};

function deco_login_name(msg){
  var deco_msg = msg;
  var name_reg = RegExp("@(.+?)さん", "g");
  deco_msg = deco_msg.replace( name_reg, function(){
    if (arguments[1] == login_name){
      return '<span class="label label-important">' + arguments[0] + '</span>'
    }else{
      return '<span class="label label-info">' + arguments[0] + '</span>'
    }
  });
  return deco_msg;
}

function include_target_name(msg,name){
  var name_reg = RegExp("@" + name + "( |　|さん|$)");
  if (msg.match(name_reg)){
    return true;
  }
  return false;
}

function get_id(name){
  for(var i = 0; i < latest_login_list.length; ++i ){
    if ( latest_login_list[i].name == name ){
      return latest_login_list[i].id;
    }
  }
  return 0;
}

function change_style(css_file){
  //console.log("change to " + css_file );
  $("#devhub-style").attr('href','/stylesheets/' + css_file);
  $.cookie(COOKIE_CSS_NAME,css_file,{ expires: COOKIE_EXPIRES });
}

