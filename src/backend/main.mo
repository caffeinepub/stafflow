import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Char "mo:core/Char";
import Iter "mo:core/Iter";
import Random "mo:core/Random";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  public type Company = {
    id : Text;
    name : Text;
    entryCode : Text;
    createdAt : Int;
  };

  public type Personnel = {
    id : Text;
    name : Text;
    companyId : Text;
    entryCode : Text;
    isAdmin : Bool;
    department : Text;
    isActive : Bool;
  };

  public type AttendanceRecord = {
    id : Text;
    personnelId : Text;
    companyId : Text;
    checkIn : Int;
    checkOut : Int;
    hasCheckedOut : Bool;
  };

  public type DepartmentSummary = {
    department : Text;
    personnel : [Personnel];
  };

  public type UserProfile = {
    name : Text;
    personnelId : ?Text;
    companyId : ?Text;
  };

  let companies = Map.empty<Text, Company>();
  let personnel = Map.empty<Text, Personnel>();
  let attendanceRecords = Map.empty<Text, AttendanceRecord>();
  var nextCompanyId = 1;
  var nextPersonnelId = 1;
  var nextAttendanceRecordId = 1;
  let accessControlState = AccessControl.initState();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let principalToPersonnel = Map.empty<Principal, Text>();
  let principalToCompany = Map.empty<Principal, Text>();

  include MixinAuthorization(accessControlState);

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user: Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func generateEntryCodeInternal(seed : ?Nat) : Text {
    let chars : [Char] = "abcdefghijklmnopqrstuvwxyz1234567890".toArray();
    let arrayText = Array.tabulate(
      6,
      func(i) {
        let seedValue = switch (seed) {
          case (null) { 0 };
          case (?value) { value };
        };
        let index = ((i + seedValue) % 36) : Nat;
        chars[index];
      },
    );
    let text : Text = arrayText.toText();
    text;
  };

  func generateEntryCode() : async Text {
    let rnd = Random.crypto();
    let number = await* rnd.natRange(0, 99_999);
    if (number > 36) { return generateEntryCodeInternal(?number); };

    generateEntryCodeInternal(null);
  };

  func getCurrentTime() : Int {
    Time.now();
  };

  func getPersonnelByCompany(companyId : Text) : [Personnel] {
    let iter = personnel.values();
    let result = personnel.values().toArray().filter(
      func(p) {
        return p.companyId == companyId;
      }
    );
    result;
  };

  func isCompanyAdmin(caller: Principal, companyId: Text) : Bool {
    switch (principalToPersonnel.get(caller)) {
      case (null) { false };
      case (?personnelId) {
        switch (personnel.get(personnelId)) {
          case (null) { false };
          case (?person) {
            person.companyId == companyId and person.isAdmin and person.isActive;
          };
        };
      };
    };
  };

  func getCallerPersonnelId(caller: Principal) : ?Text {
    principalToPersonnel.get(caller);
  };

  func isPersonnelInCompany(personnelId: Text, companyId: Text) : Bool {
    switch (personnel.get(personnelId)) {
      case (null) { false };
      case (?person) { person.companyId == companyId };
    };
  };

  public shared ({ caller }) func registerCompany(name : Text) : async Company {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register companies");
    };
    let id = nextCompanyId.toText();
    let entryCode = await generateEntryCode();
    let company : Company = {
      id;
      name;
      entryCode;
      createdAt = getCurrentTime();
    };
    companies.add(id, company);
    principalToCompany.add(caller, id);
    nextCompanyId += 1;
    company;
  };

  public shared ({ caller }) func loginCompany(entryCode : Text) : async ?Company {
    let iter = companies.values();
    let company = companies.values().toArray().filter(
      func (c) {
        return c.entryCode == entryCode;
      }
    );
    if (company.isEmpty()) { return null };
    principalToCompany.add(caller, company[0].id);
    ?company[0];
  };

  public shared ({ caller }) func addPersonnel(companyId : Text, name : Text, department : Text, isAdmin : Bool) : async Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add personnel");
    };
    if (not companies.containsKey(companyId)) {
      Runtime.trap("Company not found");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can add personnel");
    };
    let id = nextPersonnelId.toText();
    let entryCode = await generateEntryCode();
    let person : Personnel = {
      id;
      name;
      companyId;
      entryCode;
      isAdmin;
      department;
      isActive = true;
    };
    personnel.add(id, person);
    nextPersonnelId += 1;
    person;
  };

  public query ({ caller }) func loginPersonnel(entryCode : Text) : async ?Personnel {
    let iter = personnel.values();
    let person = personnel.values().toArray().filter(
      func (p) {
        return p.entryCode == entryCode;
      }
    );
    switch (person.values().next()) {
      case (null) { null };
      case (?person) {
        if (person.isActive) {
          ?person;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func linkPersonnelToPrincipal(entryCode : Text) : async ?Personnel {
    let iter = personnel.values();
    let person = personnel.values().toArray().filter(
      func (p) {
        return p.entryCode == entryCode;
      }
    );
    switch (person.values().next()) {
      case (null) { null };
      case (?person) {
        if (person.isActive) {
          principalToPersonnel.add(caller, person.id);
          ?person;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func checkIn(personnelId : Text, companyId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check in");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only check in for yourself");
        };
      };
    };
    if (not companies.containsKey(companyId)) {
      Runtime.trap("Company not found");
    };
    switch (personnel.get(personnelId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (not person.isActive) {
          Runtime.trap("Personnel is not active");
        };
        if (person.companyId != companyId) {
          Runtime.trap("Personnel does not belong to this company");
        };
      };
    };
    let id = nextAttendanceRecordId.toText();
    let record : AttendanceRecord = {
      id;
      personnelId;
      companyId;
      checkIn = getCurrentTime();
      checkOut = 0;
      hasCheckedOut = false;
    };
    attendanceRecords.add(id, record);
    nextAttendanceRecordId += 1;
    ?record;
  };

  public shared ({ caller }) func checkOut(personnelId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check out");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only check out for yourself");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    let activeRecord = attendanceRecords.values().toArray().filter(
      func (record) {
        return record.personnelId == personnelId and not record.hasCheckedOut;
      }
    );
    if (activeRecord.isEmpty()) {
      Runtime.trap("No active check-in found");
    };
    let record = activeRecord[0];
    let updatedRecord : AttendanceRecord = {
      record with
      checkOut = getCurrentTime();
      hasCheckedOut = true;
    };
    attendanceRecords.add(record.id, updatedRecord);
    ?updatedRecord;
  };

  public query ({ caller }) func getPersonnelList(companyId : Text) : async [Personnel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personnel list");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      switch (getCallerPersonnelId(caller)) {
        case (null) { Runtime.trap("Unauthorized: Only company members can view personnel list"); };
        case (?personnelId) {
          if (not isPersonnelInCompany(personnelId, companyId)) {
            Runtime.trap("Unauthorized: Only company members can view personnel list");
          };
        };
      };
    };
    getPersonnelByCompany(companyId);
  };

  public query ({ caller }) func getAttendanceByCompany(companyId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view company attendance");
    };
    let iter = attendanceRecords.values();
    attendanceRecords.values().toArray().filter(func (record) {
      return record.companyId == companyId;
    });
  };

  public query ({ caller }) func getAttendanceByPersonnel(personnelId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own attendance");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    attendanceRecords.values().toArray().filter(func (record) {
      return record.personnelId == personnelId;
    });
  };

  public query ({ caller }) func getActiveCheckIn(personnelId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active check-in");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own active check-in");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    let filteredIter = attendanceRecords.values().toArray().filter(
      func(record){
      record.personnelId == personnelId and not record.hasCheckedOut
      }
    );
    switch (filteredIter.values().next()) {
      case (null) { null };
      case (?record) { ?record };
    };
  };

  public shared ({ caller }) func updatePersonnel(id : Text, name : Text, department : Text, isActive : Bool) : async ?Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update personnel");
    };
    switch (personnel.get(id)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (not isCompanyAdmin(caller, person.companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only company admins can update personnel");
        };
        let updatedPerson : Personnel = {
          person with
          name;
          department;
          isActive;
        };
        personnel.add(id, updatedPerson);
        ?updatedPerson;
      };
    };
  };

  public query ({ caller }) func getPersonById(personId : Text) : async Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personnel");
    };
    switch (personnel.get(personId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        switch (getCallerPersonnelId(caller)) {
          case (null) {
            if (not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Personnel not linked to caller");
            };
          };
          case (?callerPersonnelId) {
            if (callerPersonnelId != personId and not isCompanyAdmin(caller, person.companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
              if (not isPersonnelInCompany(callerPersonnelId, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view personnel in your company");
              };
            };
          };
        };
        return person;
      };
    };
  };

  public query ({ caller }) func getCompanyById(companyId : Text) : async Company {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view companies");
    };
    switch (companies.get(companyId)) {
      case (null) {
        Runtime.trap("Company not found");
      };
      case (?company) {
        switch (getCallerPersonnelId(caller)) {
          case (null) {
            if (not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Personnel not linked to caller");
            };
          };
          case (?personnelId) {
            if (not isPersonnelInCompany(personnelId, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Can only view your own company");
            };
          };
        };
        return company;
      };
    };
  };

  public query ({ caller }) func getPersonAttendanceByDate(personId : Text, dateStart : Int, dateEnd : Int) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own attendance");
              };
            };
          };
        };
      };
    };
    attendanceRecords.values().toArray().filter(func (record) {
      return record.personnelId == personId and record.checkIn >= dateStart and record.checkIn <= dateEnd;
    });
  };

  public query ({ caller }) func getDepartmentSummaries(companyId : Text) : async [DepartmentSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view department summaries");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view department summaries");
    };
    let personnel = getPersonnelByCompany(companyId);
    let departments = personnel.map(
      func (person) { person.department }
    );
    departments.map(
      func (dept) {
        let deptPersonnel = personnel.filter(
          func (person) {
            person.department == dept;
          }
        );
        {
          department = dept;
          personnel = deptPersonnel;
        };
      }
    );
  };
};
