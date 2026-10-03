import clipboardy from 'clipboardy';
import figlet from "figlet";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import EngDis from "./lib/engdis.lib.js";

const rl = readline.createInterface({ input, output });

async function prompt(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const envMap = {
      subject: process.env.ENGDIS_SUBJECT ?? "fe2",
      studentId: process.env.ENGDIS_STUDENT_ID ?? "",
      selectAllCourse: process.env.ENGDIS_SELECT_ALL_COURSE ?? "n",
      selectId: process.env.ENGDIS_SELECT_ID ?? "0",
    };

    if (question.includes("subject")) {
      const value = envMap.subject;
      console.log(`${question}${value}`);
      return value;
    }

    if (question.includes("studentID")) {
      const value = envMap.studentId;
      console.log(`${question}${value}`);
      return value;
    }

    if (question.includes("select all course")) {
      const value = envMap.selectAllCourse;
      console.log(`${question}${value}`);
      return value;
    }

    if (question.includes("select id or index")) {
      const value = envMap.selectId;
      console.log(`${question}${value}`);
      return value;
    }

    return "";
  }

  return rl.question(question);
}

const baseUrlFe1 = "https://edwebservices2.engdis.com/api/";
const baseUrlFe2 = "https://edwebservices2.engdis.com/api/";
class Main {
  setting = {
    baseUrl: "",
    username: "7777777",
    password: "7777777",
  };
  engdis = new EngDis();

  constructor() {
    this.welcome();
  }

  async main() {
    await this.getInput();
    const authToken = await this.login();
    if (!authToken) process.exit(1);
    this.engdis = new EngDis(this.setting.baseUrl, authToken);
    let courses = await this.selectCourse();
    await this.setTaskSuccess(courses);

    const progress = await this.engdis.getProgress();
    console.log("Progress:", progress[0], "Grade:", progress[1])
  }

  async welcome() {
    console.log(
      "[+] Auto English Discovery for S KMITL ONLY!, latest update at 3/10/26.\n Automatic Learning Course Make Test Success"
    );
    console.log(`technical do not open terminal and login same user at  same time .\n if it happen login u friend account for reset browser cookie sec`);
  }

  async logout() {
    console.log("\n[*] waiting logout...");
    await this.engdis.Logout();
    console.log("[#] logout success, see u soon.");
    // process.exit();
  }

  async getInput() {
    this.setting.baseUrl =
      (await prompt("[?] choose your subject ( fe1 or fe2 ) : ")) == "fe1"
        ? baseUrlFe1
        : baseUrlFe2;
    this.setting.username = await prompt("[?] enter your studentID  : ");
    this.setting.password = this.setting.username.slice(-5);
  }

  async login() {
    const engdis = new EngDis(this.setting.baseUrl);
    console.log("[#] Waiting for Response...");
    const result = await engdis.Login(
      this.setting.username,
      this.setting.password
    );
           console.log({
     responseKeys: Object.keys(result ?? {}),
     dataKeys: Object.keys(result?.Data ?? {}),
     userDataKeys: Object.keys(result?.Data?.UserData ?? {}),
     userInfoKeys: Object.keys(result?.Data?.UserData?.UserInfo ?? {}),
     isSuccess: result?.isSuccess,
     tokenPresent: Boolean(result?.Data?.UserData?.UserInfo?.Token),
   });
    const token =
      result?.Data?.UserData?.UserInfo?.Token ?? result?.UserInfo?.Token;
    if (!token) {
      console.log(
        "[!] login response did not include an authentication token. Check your credentials or sign out from the website and try again."
      );
      return;
    }

    console.log(`[#] Login Success.\n`);
    console.log(`[0] Welcome ${result.Data.UserData.UserInfo.UserName} .\n [*] Name : ${result.Data.UserData.UserInfo.FName}`);
    
    return token;
  }

  async selectCourse() {
    let courseProgressListTable = [];
    let courseTmp = [];
    const selectAllCourse = (await prompt("[?] select all course (y/n) : ")) == "y" ? true : false;

    console.log();
    var courseProgressList = await this.engdis.getGetDefaultCourseProgress();
    console.log(courseProgressList);
    if (!courseProgressList.isSuccess) {
      console.log("[!] token die, please login again.");
      process.exit();
    }

    courseProgressList.data.map((item) => {
      if (selectAllCourse) {
        console.log(1);
        console.log(`[#] you choose course ( ${item.Name} )`);
        courseTmp.push({
          NodeId: item.NodeId,
          ParentNodeId: item.ParentNodeId,
        });
      } else {
        courseProgressListTable.push({
          Id: item.NodeId,
          Name: item.Name,
        });
      }
    });

    if (selectAllCourse) return courseTmp;

    console.table(courseProgressListTable);
    const selectId = await prompt("[?] select id or index : ");
    // const selectId = 8;

    var find = courseProgressList.data.find(
      (ele, index) => ele.NodeId == selectId || index == selectId
    );

    if (!find) {
      console.log("[!] can't find id or index", selectId);
      return [];
    }

    // console.log(`[#] you choose course ( ${find.Name} )`);
    courseTmp.push({
      NodeId: find.NodeId,
      ParentNodeId: find.ParentNodeId,
    });
    return courseTmp;
  }

  async setTaskSuccess(courses) {
    for (const course of courses) {
      const courseTree = await this.engdis.getCourseTree(
        course.NodeId,
        course.ParentNodeId
      );

      if (!courseTree || !Array.isArray(courseTree.data)) {
        console.log("[!] course tree unavailable for this course.");
        continue;
      }

      for (const item of courseTree.data) {
        console.log(`\n[*] Checking ( ${item.Name} )`);

        const children = Array.isArray(item.Children) ? item.Children : [];

        for (const elem of children) {
          if (elem.Name !== "Test") {
            console.log(`[#] Doing Working ${elem.Name}`);

            const elementChildren = Array.isArray(elem.Children) ? elem.Children : [];
            for (const ele of elementChildren) {
              await this.engdis.setSucessTask(
                course.ParentNodeId,
                ele.NodeId
              );
            }
          } else {
            console.log(`[#] Final ${elem.Name}`);
            await this.setTest100Percent(
              item["Metadata"]["Code"],
              item["NodeId"],
              item["ParentNodeId"]
            );
          }
        }
      }
    }
  }

  async setTest100Percent(code, nodeId, parentNodeId) {
    const testData = await this.engdis.getTestCodeDigit(code)
    if (!testData || !Array.isArray(testData.tasks)) {
      console.log("[!] test data unavailable, skipping this test.")
      return
    }

    var submitAnswer = [];

    for (var data of testData["tasks"]) {
      const id = data["id"]
      const code = data["code"]
      const type = data["type"]
      const testAnswerData = await this.engdis.practiceGetItem(code)

      if (testAnswerData["data"]["i"]["q"].length > 1) {
        for (var i = 1; i < testAnswerData["data"]["i"]["q"].length; i++) {
          testAnswerData["data"]["i"]["q"][0]["al"] = testAnswerData["data"]["i"]["q"][0]["al"].concat(testAnswerData["data"]["i"]["q"][i]["al"])
        }
      }

      const correctAnswerList = testAnswerData["data"]["i"]["q"][0]["al"]

      if (correctAnswerList.length == 0) continue
      const foundC = correctAnswerList[0]["a"].filter(item => item["c"] == "1")

      if (foundC.length != 0) {
        const answerUa = correctAnswerList.map(obj => [obj.id, obj.a.find(answer => answer.c === '1').id]);
        
        submitAnswer.push({
          "iId"	:	id,
          "iCode"	:	code,
          "iType"	: type,
          "ua": [
            {
                "qId": 1,
                "aId": answerUa
            }
          ]
        })
      } else {
        var uaList = [];

        for (const ans of correctAnswerList) {
          uaList.push(              {
            "qId": "1",
            "aId": [
                [
                    ans["id"],
                    ans["a"][0]["id"]
                ]
            ]
          })
        }

        submitAnswer.push({
          "iId": id,
          "iCode": code,
          "iType": type,
          "ua": uaList
        })
      }
    }

    const testStatus = await this.engdis.SaveUserTestV1(nodeId, parentNodeId, submitAnswer)
    console.log("[+] Next Assignment")

    if (testStatus["data"]["finalMark"] != "100") {
      const submitAnswerJson = JSON.stringify(submitAnswer)
      try {
        clipboardy.writeSync(submitAnswerJson)
        console.log("[!] test result was copied to the clipboard")
      } catch (error) {
        console.log("[!] clipboard is unavailable; submitAnswer:")
      }
    }
  }
}

(async () => {
  const mainClass = new Main();
  mainClass.main();
})();
