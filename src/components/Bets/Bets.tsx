import React,{ useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { isMobile } from "react-device-detect";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowParams,
  GridToolbarContainer,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Paper,
  TextField,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import CancelIcon from "@mui/icons-material/Close";
import {
  BetModel,
  EditToolbarProps,
  Enums,
  IDropdownValue,
  ISelectionsResult,
} from "../../models";
import { deleteBet, upsertBet, getBetHistory } from "../../api";
import { BetStatus, WinStatus, LiveStatus } from "../../models/enums";
import { Currency } from "../../database-models";
import Modal from "../UI/Modal";
import { getBetsColumns } from "./BetsColumns";

const getAbbreviations = (currencies: Currency[] | undefined) => {
  if (!currencies) return [];
  return currencies.map((cur) => cur.abbreviation);
};
const insertCurrenciesIntoColumns = (columns: any, abbreviations: string[]) => {
  const idx = columns.findIndex((c: any) => c.field === "psLimit");
  const currencyColumns = abbreviations.map((a) => ({
    field: `amount${a}`,
    headerName: a,
    type: "text",
    editable: true,
    width: 70,
  }));
  columns.splice(idx + 1, 0, ...currencyColumns);
};
function Bets(props: {
  id: string;
  isRead: boolean;
  arePengindBets: boolean;
  selectBetIdFn: (id: number) => void;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;

  defaultRows: Array<BetModel> | undefined;
  currencies: Array<Currency> | undefined;

  possibleCounteragents: Array<IDropdownValue> | undefined;
  allSelections: ISelectionsResult;
  possibleSports: Array<IDropdownValue> | undefined;
  possibleTournaments: Array<IDropdownValue> | undefined;
  possibleMarkets: Array<IDropdownValue> | undefined;
}) {
  const {
    isRead,
    selectBetIdFn,
    setIsLoading,
    defaultRows,
    currencies,
    possibleCounteragents,
    possibleSports,
    possibleTournaments,
    possibleMarkets,
  } = props;

  const [rows, setRows] = useState<Array<BetModel>>(
    defaultRows ? defaultRows : []
  );
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>(
    {}
  );
  const [copiedRowIds, setCopiedRowIds] = useState<
    [number, number] | null
  >(null);
  const [deleteRowId, setDeleteRowId] = useState<number | undefined>(
    undefined
  );
  const [deleteDialogIsOpened, setOpenDeleteDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({});


  const abbreviations = getAbbreviations(currencies);

  useEffect(() => {
    setRows((oldRows) => {
      return defaultRows ? defaultRows : [];
    });

    setRowModesModel(() => {
      return {};
    });
  }, [defaultRows]);


  useEffect(() => {
    const savedColumnVisibilityModel = JSON.parse(localStorage.getItem(`${props.id}ColumnVisibilityModel`) || '{}');
    if (savedColumnVisibilityModel) {
      setColumnVisibilityModel(savedColumnVisibilityModel);
    }
  }, []);

  const handleColumnVisibilityChange = useCallback((params: any) => {
    const newVisibilityModel = {...columnVisibilityModel, ...params};
    localStorage.setItem(`${props.id}ColumnVisibilityModel`, JSON.stringify(newVisibilityModel));
    setColumnVisibilityModel(newVisibilityModel);
  }, []);

  function EditToolbar(props: EditToolbarProps) {
    const { setRows, setRowModesModel } = props;

    const handleAddNewClick = () => {
      const id = Math.round(Math.random() * 1000000);
      setRows((oldRows) => [
        {
          id,
          dateCreated: new Date(),
          betStatus: {
            id: BetStatus.Pending.toString(),
            label: BetStatus[BetStatus.Pending],
          },
          winStatus: {
            id: WinStatus.None.toString(),
            label: WinStatus[WinStatus.None],
          },
          stake: undefined,
          counterAgent: undefined,
          sport: undefined,
          liveStatus: {
            id: LiveStatus.PreLive.toString(),
            label: LiveStatus[LiveStatus.PreLive],
          },
          psLimit: undefined,
          market: undefined,
          tournament: undefined,
          selection: undefined,
          amounts: undefined,
          totalAmount: undefined,
          odd: undefined,
          dateFinished: undefined,
          profits: undefined,
          notes: undefined,

          actionTypeApplied: undefined,
          isSavedInDatabase: false,
        } as BetModel,
        ...oldRows,
      ]);

      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit, className: `super-app-theme--edit` },
      }));
    };

    const isAnyRowInEditMode = rows.some((r: BetModel) => {
      const rowModeData = rowModesModel[r.id];
      return rowModeData && rowModeData.mode === GridRowModes.Edit;
    });

    return !isMobile ? (
      <GridToolbarContainer>
        <Button
          color="primary"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNewClick}
          disabled={isAnyRowInEditMode}
        >
          Create a bet
        </Button>
      </GridToolbarContainer>
    ) : (
      <></>
    );
  }

  //#region Delete dialog

  const handleClickOpenOnDeleteDialog = (id: GridRowId) => () => {
    setDeleteRowId(parseInt(id.toString(), 10));
    setOpenDeleteDialog(true);
  };

  const handleCloseOnDeleteDialog = () => {
    setDeleteRowId(undefined);
    setOpenDeleteDialog(false);
  };

  //#endregion

  //#region Actions handlers

  const handleSaveClick = (id: GridRowId) => () => {
    setCopiedRowIds(null);
    setRows((previousRowsModel) => {
      return previousRowsModel.map((row: BetModel) => {
        if (row.id === id) {
          return {
            ...row,
            actionTypeApplied: row.isSavedInDatabase
              ? Enums.ActionType.EDITED
              : Enums.ActionType.SAVED,
          };
        } else {
          return row;
        }
      });
    });
    setRowModesModel((previousRowModesModel) => {
      return { ...previousRowModesModel, [id]: { mode: GridRowModes.View } };
    });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setCopiedRowIds(null);
    const canceledRow = rows.find((r) => r.id === id);
    if (!canceledRow) {
      return;
    }

    if (!canceledRow.isSavedInDatabase) {
      setRows((previousRowsModel) => {
        return previousRowsModel.filter((row) => {
          return row.id !== id;
        });
      });
    } else {
      setRows((previousRowsModel) => {
        return previousRowsModel.map((row) => {
          if (row.id === id) {
            return {
              ...row,
              actionTypeApplied: Enums.ActionType.CANCELED,
            };
          } else {
            return row;
          }
        });
      });
      setRowModesModel((previousRowModesModel) => {
        return { ...previousRowModesModel, [id]: { mode: GridRowModes.View } };
      });
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRows((previousRowsModel) => {
      return previousRowsModel.map((row) => {
        if (row.id === id) {
          return {
            ...row,
            actionTypeApplied: Enums.ActionType.EDITED,
          };
        } else {
          return {
            ...row,
            actionTypeApplied: undefined,
          };
        }
      });
    });

    setRowModesModel((previousRowModesModel) => {
      let newRowsModel: GridRowModesModel = {};
      newRowsModel[id] = { mode: GridRowModes.Edit };
      for (var i = 0; i <= rows.length - 1; i++) {
        const currentRow = rows[i];
        if (currentRow.id === id) {
          newRowsModel[currentRow.id] = { mode: GridRowModes.Edit };
        } else {
          newRowsModel[currentRow.id] = { mode: GridRowModes.View };
        }
      }

      return newRowsModel;
    });
  };

  const handleHistoryClick = async (params: GridRowParams) => {
    const row = rows!.find((row) => row.id === params.id);

    if (!row) {
      return;
    }
    // const betId = await selectBetIdFn(row.id);
    const history = await getBetHistory(row.id);

    setShowHistoryModal(true);
    setHistory(history);
  };

  const handleDeleteClick = async () => {
    if (!deleteRowId) {
      return;
    }

    setIsLoading(true);

    await deleteBet({ id: deleteRowId });
    setDeleteRowId(undefined);
    setOpenDeleteDialog(false);
    setRows((previousRows) =>
      previousRows.filter((row) => row.id !== deleteRowId)
    );
    setRowModesModel((previousRowModesModel) => {
      delete previousRowModesModel[deleteRowId];
      return previousRowModesModel;
    });

    setIsLoading(false);
  };

  const handleCopyBetClick = (id: GridRowId) => () => {
    const clickedRow = rows.find((row) => row.id === id);
    if (!clickedRow) {
      return;
    }

    const randomId: number = Math.round(Math.random() * 1000000);
    setRows((oldRows) => {
      return [
        {
          id: randomId,
          dateCreated: clickedRow.dateCreated,
          betStatus: clickedRow.betStatus,
          winStatus: clickedRow.winStatus,
          stake: clickedRow.stake,
          counterAgent: clickedRow.counterAgent,
          sport: clickedRow.sport,
          liveStatus: clickedRow.liveStatus,
          psLimit: clickedRow.psLimit,
          market: clickedRow.market,
          tournament: clickedRow.tournament,
          selection: clickedRow.selection,
          amounts: clickedRow.amounts,
          totalAmount: undefined,
          odd: clickedRow.odd,
          dateFinished: undefined,
          profits: clickedRow.profits,
          notes: clickedRow.notes,

          actionTypeApplied: undefined,
          isSavedInDatabase: false,
        } as BetModel,
        ...oldRows,
      ];
    });
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [randomId]: { mode: GridRowModes.Edit },
    }));
    setCopiedRowIds([randomId, clickedRow.id]);
  };

  const onRowClick = (params: GridRowParams) => {
    const row = rows.find((row) => row.id === params.id);
    if (row) {
      selectBetIdFn(row.id);
    }
  };

  //#endregion Actions handlers

  //#region Rows update handler

  const processRowUpdate = async (
    newRow: GridRowModel<BetModel>
  ): Promise<BetModel> => {
    const currentRow = rows.find((row) => row.id === newRow.id);
    if (!currentRow) {
      return newRow;
    }

    if (
      currentRow.actionTypeApplied === Enums.ActionType.SAVED ||
      currentRow.actionTypeApplied === Enums.ActionType.EDITED
    ) {
      const amounts = Object.fromEntries(Object.entries(newRow).filter(([key, value]) => key.startsWith('amount')));
      const newRowData: BetModel = {
        ...currentRow,
        dateCreated: newRow.dateCreated,
        betStatus: currentRow.betStatus,
        winStatus: currentRow.winStatus,
        liveStatus: currentRow.liveStatus,
        counterAgent: currentRow.counterAgent,
        sport: currentRow.sport,
        tournament: currentRow.tournament,
        market: currentRow.market,

        stake: newRow.stake,
        psLimit: newRow.psLimit,
        ...amounts,
        totalAmount: newRow.totalAmount,
        odd: newRow.odd,
        dateFinished: new Date(),
        profits: newRow.profits,
        notes: newRow.notes,

        selection: newRow.selection,
      };
      setIsLoading(true);

      const rowData = await upsertBet(newRowData);
      if (!rowData || !rowData.data) {
        return newRow;
      }

      setRows((previousRowsModel) => {
        return previousRowsModel.map((row) => {
          if (row.id === newRow.id) {
            return {
              ...newRowData,
              id: rowData.data.id,
              totalAmount: rowData.data.totalAmount,

              actionTypeApplied: undefined,
              isSavedInDatabase: true,
            };
          } else {
            return row;
          }
        });
      });

      setRowModesModel((previousRowModesModel) => {
        return {
          ...previousRowModesModel,
          [rowData.data.id]: { mode: GridRowModes.View },
        };
      });

      setIsLoading(false);

      newRow.id = rowData?.data.id;
    } else {
      setRowModesModel((previousRowModesModel) => {
        return {
          ...previousRowModesModel,
          [newRow.id]: { mode: GridRowModes.View },
        };
      });
    }

    toast(
      currentRow.actionTypeApplied === Enums.ActionType.CANCELED
        ? "Canceled"
        : `Saved bet with id ${newRow!.id}`,
      {
        position: "top-center",
      }
    );

    return newRow;
  };

  //#endregion Rows update handler

  // const handleChange = (e: any, value: any, params: any) => {
  //   setRows((previousRowsModel) => {
  //     return previousRowsModel.map((row: BetModel) => {
  //       if (row.id === params.row.id) {
  //         return {
  //           ...row,
  //           betStatus: value
  //             ? typeof value === "string"
  //               ? { id: value, label: value }
  //               : value
  //             : undefined,
  //         };
  //       } else {
  //         return row;
  //       }
  //     });
  //   });
  // };
  // const handleKeyDown = (event: React.KeyboardEvent) => {
  //   switch (event.key) {
  //     case "Tab": {
  //       const editableRow = document.querySelector(
  //         ".MuiDataGrid-row--editable"
  //       );
  //       if (!editableRow) return;
  //       (editableRow.childNodes[2] as HTMLElement).focus();
  //       break;
  //     }
  //     default:
  //   }
  // };
  let columns: Array<GridColDef> = getBetsColumns({ 
    rows, 
    setRows,
    possibleCounteragents,
    possibleSports,
    possibleTournaments,
    possibleMarkets,
    currencies,
    rowModesModel,
    isRead,
    isMobile,
    handleSaveClick,
    handleCancelClick,
    handleEditClick,
    handleHistoryClick,
    handleCopyBetClick,
    handleClickOpenOnDeleteDialog,
  });

  const handleModalClose = () => setShowHistoryModal(false);
  if (showHistoryModal && history) {
    return (
      <Modal
        open={showHistoryModal}
        handleClose={handleModalClose}
        betsHistory={history}
      />
    );
  }

  if (props.arePengindBets) {
    columns = columns.filter((c) => c.headerName !== "Profits");
  }

  insertCurrenciesIntoColumns(columns, abbreviations);
  return (
    <Paper sx={{ paddingTop: "1%" }}>
      {rows ? (
        <>
          <DataGrid
            columns={columns}
            initialState={{
              columns: {
                columnVisibilityModel: {
                  ...JSON.parse(localStorage.getItem(`${props.id}ColumnVisibilityModel`) || '{}')
                },
              },
            }}
            onColumnVisibilityModelChange={handleColumnVisibilityChange}
            getRowClassName={(params) => {
              if (!copiedRowIds) return "";
              if (copiedRowIds.includes(params.row.id)) {
                return `super-app-theme--edit`;
              }
              return "";
            }}
            columnBuffer={2}
            columnThreshold={2}
            rows={rows}
            slots={{
              toolbar: isRead ? undefined : EditToolbar,
            }}
            rowModesModel={rowModesModel}
            processRowUpdate={processRowUpdate}
            slotProps={{
              toolbar: { setRows, setRowModesModel },
            }}
            onRowClick={onRowClick}
            editMode="row"
            sx={{
              height: 500,
            }}
          />
          <Dialog
            open={deleteDialogIsOpened}
            onClose={handleCloseOnDeleteDialog}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">
              {"Are you sure you want to delete the bet?"}
            </DialogTitle>
            <DialogActions>
              <Button onClick={handleDeleteClick} autoFocus>
                Ok
              </Button>
              <Button onClick={handleCloseOnDeleteDialog}>No</Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Paper>
  );
}

export default React.memo(Bets);
