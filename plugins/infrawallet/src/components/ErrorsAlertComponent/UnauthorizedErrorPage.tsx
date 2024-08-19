import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, useSupportConfig } from '@backstage/core-components';

interface IErrorPageProps {
  supportUrl?: string;
}

/** @public */
export type ErrorPageClassKey = 'container' | 'title' | 'subtitle';

const useStyles = makeStyles(
  theme => ({
    container: {
      padding: theme.spacing(8),
      [theme.breakpoints.down('xs')]: {
        padding: theme.spacing(2),
      },
    },
    title: {
      paddingBottom: theme.spacing(5),
      [theme.breakpoints.down('xs')]: {
        paddingBottom: theme.spacing(4),
        fontSize: theme.typography.h3.fontSize,
      },
    },
    subtitle: {
      color: theme.palette.textSubtle,
    },
  }),
  { name: 'BackstageErrorPage' },
);

/**
 * Error page with status and description
 *
 * @public
 *
 */
export function UnauthorizedErrorPage(props: IErrorPageProps) {
  const {
    supportUrl,
  } = props;
  const classes = useStyles();
  const navigate = useNavigate();
  const support = useSupportConfig();

  return (
    <Grid container className={classes.container}>
      <Grid item xs={12} sm={12} md={12}>
        <Typography
          data-testid="error"
          variant="body1"
          className={classes.subtitle}
        >
          Ops! Parece que você não tem autorização neste momento.
        </Typography>
        <br/>
        <Typography variant="h6" className={classes.title}>
          <Link to="#" data-testid="go-back-link" onClick={() => navigate(-1)}>
            Volte
          </Link>
          ... ou por favor{' '}
          <Link to={supportUrl || support.url}>contate o suporte</Link> se você
          acredita que isso seja um problema.
        </Typography>
      </Grid>
    </Grid>
  );
}