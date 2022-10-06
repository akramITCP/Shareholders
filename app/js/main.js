// Constants
const tableId = "#table";

// Variables
var dataSource = [], arrayData = [];
var isEuroFormat = null, masterLang = null;

$(async () => {
    await SetPageLanguage();
    InitTreeList(null)
    FetchData();
});

async function FetchData() {
    try {
        await ZOHO.CREATOR.init();

        ///////////// Get the company settings /////////////
        config = {
            reportName: "Company_Settings_API",
            criteria: "Customer == thisapp.LoginUser.GetSelectedCompanyID()"
        }
      
        var { data } = await ZOHO.CREATOR.API.getAllRecords(config);
        // Set the currency format
        isEuroFormat = data[0].Currency_display_format == "EUR" ? true : false;

        config = {
            reportName: "Shareholders1",
            criteria: "Customer == thisapp.LoginUser.GetSelectedCompanyID()"
        }
    
        try {
          // Get Share capital data from Zoho
          var { data } = await ZOHO.CREATOR.API.getAllRecords(config);
                for (const element of data) {
                    // Data table
                        let aux = {
                            ID: element.Child_ID,
                            Parent_ID: element.Parent_ID,
                            Full_Name: element.Shareholder,
                            Customer:element.Customer,
                            Shares: element.Shares,
                            Total_Shares: element.Total != "" ? element.Total : 0,
                            Format: isEuroFormat,
                            Type: element.Type_field != "true" ? masterLang.Person : masterLang.Company,
                            Registro: element.ID,
                        }
                    arrayData.push(aux);
                }
                InitTreeList(arrayData)

        } catch (e) {
            console.log(e);
          throw "No Share Capital found for this customer.";
        }   
    } catch (e) {
        console.error(e);
    }
}

function InitTreeList(ds) {
    // Init the tree
    $(tableId).dxTreeList({
        dataSource: ds,
        keyExpr: 'ID',
        parentIdExpr: 'Parent_ID',
        width: "90%",
        showRowLines: true,
        showBorders: true,
        autoExpandAll:true,
        searchPanel: {
            visible: true,
        },
        editing: {
          mode: 'batch',
          allowAdding: function(e) {
            return e.row.data.Type == masterLang.Company;
          },
          allowUpdating: true,
          allowDeleting: true,
          useIcons: true,
        },
        columns: [{
            dataField: 'Full_Name',
            caption: masterLang.Name,
            validationRules: [{ type: 'required' }],
        },{
            dataField: 'Parent_ID',
            caption: masterLang.Parent,
            allowEditing: false,
            visible: false,
        },{
            dataField: 'ID',
            caption: 'Child_ID',
            visible: false,
            allowEditing: false,
        },{
            dataField: "Type",
            caption: masterLang.Type,
            validationRules: [{ type: 'required' }],
            lookup: {
                dataSource: [
                    masterLang.Company,
                    masterLang.Person,
                ]
            },
        },{
            dataField: 'Shares',
            caption: masterLang.Shares,
            editorType: 'dxNumberBox',
            format: function(e) {
                return e + '%';
            },
            setCellValue: function(newData, value, currentRowData) {
                var Parent_ds = ds.find((element) => element.ID == currentRowData.Parent_ID);
                newData.Shares = value;
                newData.Total_Shares =  value/100 * Parent_ds.Total_Shares;
            },
            validationRules: [{
                type: "custom",
                validationCallback: validateNumber,
                message: 'Sum of Childs must be 100%'
            }]
        },{
            dataField: 'Total_Shares',
            caption: masterLang.TotalShares,
            allowEditing: false,
            format: function(e) {
                return FormatNumber(e);
            },
        },
        ],
        onInitNewRow(e) {
            let newObj = { ...e.data, Percent: 0.00, Total: 0}
            e.data.Total_Shares = parseFloat(newObj.Total);
            e.data.Shares = parseFloat(newObj.Percent);  
        },
        onRowInserted(e) {
            var datos = { ...e.data, Customer: ds[0].Customer.ID}
            AddRecord(datos)
        },
        onRowUpdated(e) {
            var datos = { ...e.data, Customer: ds[0].Customer.ID}
            UpdateRecord(datos)
        },
        onRowRemoved(e) {
            var datos = e.data;
            RemoveRecord(datos)
        },
    }).dxTreeList('instance');
}

function validateNumber (pshares) {
    var PID = pshares.data.Parent_ID; 
    var Shares_Parent = 0;
    arrayData.filter((element) => element.Parent_ID == PID && element.ID != pshares.data.ID).forEach(function (e) {
        Shares_Parent += parseFloat(e.Shares);
    });
    Shares_Parent = parseFloat(Shares_Parent) + parseFloat(pshares.value);
    return Shares_Parent <= 100;
}

function AddRecord(pdatos){
    ZOHO.CREATOR.init().then(function(data) {

        let formData = {
            "Parent_ID": pdatos.Parent_ID,
            "Child_ID": pdatos.ID,
            "Shareholder": pdatos.Full_Name,
            "Shares": pdatos.Shares,
            "Total": pdatos.Total_Shares,
            "Total1": pdatos.Total_Shares,
            "Customer": pdatos.Customer,
            "Type_field": pdatos.Type != masterLang.Company ? "false" : "true",
        }

        var config = { 
            formName : "Shareholders", 
            data  : {
                data  : formData
                }
        } 
        
        ZOHO.CREATOR.API.addRecord(config).then(function(response){
            if(response.code == 3000){
                Swal.fire(
                    masterLang.Save,
                    '',
                    'success',
                )
            } else{
                Swal.fire(
                    masterLang.Error,
                    '',
                    'error'
                )
            } 
        });
    });
}

function UpdateRecord(pdatos){
    ZOHO.CREATOR.init().then(function(data) {

        let formData = {
            "Parent_ID": pdatos.Parent_ID,
            "Child_ID": pdatos.Child_ID,
            "Shareholder": pdatos.Full_Name,
            "Shares": pdatos.Shares,
            "Total": pdatos.Total_Shares,
            "Total1": pdatos.Total_Shares,
            "Customer": pdatos.Customer,
            "Type_field": pdatos.Type != masterLang.Company ? "false" : "true",
        }
        var config = { 
            reportName: "Shareholders1",
            id: pdatos.Registro,
            data  : {
                data  : formData
                }
        } 
        
        ZOHO.CREATOR.API.updateRecord(config).then(function(response){
            if(response.code == 3000){
                Swal.fire(
                    masterLang.Save,
                    '',
                    'success',
                  )
            } else{
                Swal.fire(
                    masterLang.Error,
                    '',
                    'error'
                )
            }  
        });
    });
}

function RemoveRecord(pdatos){
    ZOHO.CREATOR.init()
        .then(function(data) {

            var config = { 
                reportName: "Shareholders1",
                criteria: "ID ==" + pdatos.Registro,
            } 
            
            ZOHO.CREATOR.API.deleteRecord(config).then(function(response){
             if(response.code == 3000){
                }
                Swal.fire(
                    masterLang.Save,
                    '',
                    'success'
                  )
            });
        });
}

///////////////////////// SET LANG /////////////////////////
const SetPageLanguage = async () => {
    let userLang = await GetSelectedLang()
    // Try to guess the lang
    if (userLang === 'Spanish') masterLang = es;
    else if (userLang === 'German') masterLang = de;
    else masterLang = en;
  }
  
  const GetSelectedLang = async () => {
    try {
      await ZOHO.CREATOR.init();
      config = {
        reportName: 'UserLanguage_API',
        criteria: 'Selected_Lang == thisapp.localization.language()'
      }
      var { data } = await ZOHO.CREATOR.API.getAllRecords(config);
      return data[0].Selected_Lang;
    } catch (e) {
      throw "Error getting the user selected language: " + e;
    }
  }

///////////////////////////// Auxiliar Functions /////////////////////////////
const FormatNumber = (value) => {
    if (this.isEuroFormat) return new Intl.NumberFormat('es', { style: 'decimal', maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(parseFloat(value)) + ' €';
    else return new Intl.NumberFormat('es', { style: 'decimal', maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(parseFloat(value));
}