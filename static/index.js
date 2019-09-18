$(function() {
  $("select").dropdown();
  $(".ui.checkbox").checkbox();
  $("#department_willing_help").popup();
  $(".ui.progress").progress({
    percent: 0
  });

  var sum = 20;
  var ar = [sum, 0, 0, 0, 0], inputs = [null, null, null, null, null], progresses = [null, null, null, null, null];
  $("#department_willing .ui.input").each(function (_, elem) {
    var i = $(elem).data("index");
    inputs[i] = $(elem).find("input");
    progresses[i] = $(elem).find(".ui.progress");

    function update(i, val) {
      ar = balance(ar, i, val);
      for (var i = 1; i <= 4; i++) {
        inputs[i].val(ar[i]);
        progresses[i].progress({
          percent: (sum - ar[0]) == 0 ? 0 : (ar[i] / (sum - ar[0]) * 100)
        });
      }

      if (ar[0] == 0) $(".ui.progress > .bar").addClass("green");
      else $(".ui.progress > .bar").removeClass("green");
    }

    $(elem).find("div[data-action=increase]").click(function () {
      var newVal = ar[i] + 1;
      update(i, newVal);
    });

    $(elem).find("div[data-action=decrease]").click(function () {
      var newVal = ar[i] - 1;
      update(i, newVal);
    });
  });
  
  if (userProfile === null) {
    $(".login_button").attr("href", "https://v.ruc.edu.cn/oauth2/authorize?response_type=code&scope=profile&state=cRAKIOI&client_id=5bdfb3e690f4d148421bc4ad.ruc&redirect_uri=" + location.href);
    if (loginError === null) {
      $("#login-modal").modal("show");
    } else {
      $("#login-error").text(loginError);
      $("#login-error-modal").modal("show");
    }
  } else parseUserProfile();
});

if (!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

function parseUserProfile() {
  var student_id = "未知", school = "未知";
  for (var i in userProfile.profiles) {
    var pf = userProfile.profiles[i];
    if (pf.code === "ruc" && pf.roletype === "学生") {
      student_id = pf.stno;
      school = pf.departmentname;
      break;
    }
  }
  $("input[name=name]").val(userProfile.name);
  $("input[name=student_id]").val(student_id);
  $("input[name=school]").val(school);
}

function encodeForm() {
  var a = $("form").serializeArray();
  var o = {
    name: null,
    wechat_id: null,
    student_id: null,
    school: null,
    willing: [],
    programming: null,
    wtf_to_learn: null,
    game: []
  }
  for (var i in a) {
    var item = a[i];
    if (Array.isArray(o[item.name])) {
      o[item.name].push(item.value.trim());
    } else o[item.name] = item.value.trim();
  }
  return o;
}

function getError(o) {
  if (o.name === "") {
    return "请输入姓名。";
  } else if (o.wechat_id === "") {
    return "请输入微信号。";
  } else if (o.student_id.length !== 10) {
    return "请输入正确的学号。";
  } else if (o.school === "") {
    return "请选择学院。";
  } else if (o.willing.reduce(function (s, x) { return s + parseInt(x) }, 0) !== 20) {
    return "请正确分配部门意愿的愿望点。";
  }
  return null;
}

function checkSubmit() {
  var data = encodeForm();
  var error = getError(data);
  if (error !== null) {
    $("#error-message").text(error);
    $("#error-modal").modal("show");
  } else {
    data.token = userProfileToken;

    $("#submit").text("提交中").attr("disabled", "disabled");
    function submit_success() {
      $("#submit").text("提交成功");
    }
    function submit_error(error) {
      $("#error-message").text(error)
      $("#error-modal").modal("show");
      $("#submit").text("提交").removeAttr("disabled");
    }

    $.post("submit", data).done(function (response) {
      if (response.success) submit_success();
      else submit_error(response.error);
    }).fail(function (jqxhr) {
      submit_error("Failed to submit: " + jqxhr.statusText);
    });
  }
}

$("#submit").click(function (e) {
  e.preventDefault();
  checkSubmit();
});

function balance(ar, pos, val) {
  ar = ar.slice();
  val = val > ar[0] + ar[pos] ? ar[0] + ar[pos] : val;
  val = val < 0 ? 0 : val;
 
  ar[0] += ar[pos] - val;
  ar[pos] = val;
 
  return ar;
}
