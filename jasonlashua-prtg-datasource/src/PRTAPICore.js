import angular from 'angular';

class PRTGAPICore {
    constructor($q, backendSrv) {
        this.$q = $q;
        this.backendSrv = backendSrv;
        this.passhash = '';
    }
    
    login(username, password, url_path) {
        var options = {
          method: 'GET',
          url: url_path + "/getpasshash.htm?username=" + username + "&password=" + password
        };
        
        return backendSrv.datasourceRequest(options).then(function (response) {
          this.passhash = response;
          return response;
        });
    }
    
    request () {}
    getVersion () {}
    
}